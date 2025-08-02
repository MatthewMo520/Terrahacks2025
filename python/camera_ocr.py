import cv2
import pytesseract
import numpy as np
from PIL import Image
from ultralytics import YOLO
import time
from typing import List, Dict, Tuple
from datetime import datetime
import pyttsx3
import threading
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bodydetect import poseDetector
from db.insert import insert_logs

# Add the project root to the Python path for services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.sms_service import SMSService

class LiveCameraOCR:
    def __init__(self, patient_id: str = "default_patient"):
        self.patient_id = patient_id
        self.model = YOLO('yolov8n.pt')
        # Set Tesseract path for macOS (installed via Homebrew)
        import os
        if os.path.exists('/opt/homebrew/bin/tesseract'):
            pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'
        else:
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
        # Initialize pose detector
        self.pose_detector = poseDetector()
        
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 480)  # Reduced resolution for better performance
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)  # Reduced resolution for better performance
        self.cap.set(cv2.CAP_PROP_FPS, 20)  # Lower FPS for better processing
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer size to minimize lag
        
        self.frame_count = 0
        self.process_every_n_frames = 5  # Much more frequent processing for better responsiveness
        self.last_detections = []
        
        # OCR cache to avoid redundant processing
        self.ocr_cache = {}
        self.cache_frame_count = 0
        
        # Pose detection variables
        self.pTime = time.time()
        self.pose_status = "idle"
        
        # Consumption tracking
        self.last_consumption_time = 0
        self.consumption_cooldown = 5  # seconds between outputs
        self.last_pill_output_time = 0  # Track pill outputs for standing position
        self.last_pose_output_time = 0  # Track pose status outputs
        self.last_food_consumption_time = 0  # Track food consumption with 30-min cooldown
        self.food_cooldown = 1800  # 30 minutes in seconds
        
        # Initialize text-to-speech engine
        self.tts_engine = pyttsx3.init()
        self.tts_engine.setProperty('rate', 150)  # Speed of speech
        self.tts_engine.setProperty('volume', 0.9)  # Volume level (0.0 to 1.0)
        
        # Initialize SMS service
        self.sms_service = SMSService()
        
        # SMS timing controls
        self.last_food_sms_time = 0  # Track food SMS with 30-min cooldown
        self.last_water_sms_time = 0  # Track water SMS with 30-sec cooldown
        self.water_cooldown = 30  # 30 seconds in seconds
        
        print("Live Camera OCR + Pose Detection Started!")
        print("Controls:")
        print("- SPACE: Capture and analyze current frame")
        print("- Q: Quit")
        print("- ESC: Exit")
    
    def classify_object(self, class_name: str, bbox: tuple, frame: np.ndarray) -> str:
        class_name_lower = class_name.lower()
        x1, y1, x2, y2 = bbox
        width = x2 - x1
        height = y2 - y1
        area = width * height
        aspect_ratio = max(width/height if height > 0 else 1, height/width if width > 0 else 1)
        
        # Skip OCR for very obvious food items to improve performance
        obvious_food_classes = ['apple', 'banana', 'orange', 'sandwich', 'pizza', 'donut', 'cake', 'hotdog']
        if any(food_class in class_name_lower for food_class in obvious_food_classes):
            return 'food'  # Skip OCR for obvious food items
        
        # Use cached OCR result if available, but only when really needed
        cache_key = f"{self.cache_frame_count}_{x1}_{y1}_{x2}_{y2}"
        if cache_key in self.ocr_cache:
            ocr_text = self.ocr_cache[cache_key]
        else:
            # Only do OCR for ambiguous cases
            if any(keyword in class_name_lower for keyword in ['bottle', 'container', 'package', 'box', 'object', 'cylinder']):
                ocr_text = self.extract_text_from_region(frame, (x1, y1, x2, y2))
                self.ocr_cache[cache_key] = ocr_text
            else:
                ocr_text = ""
        
        ocr_text_lower = ocr_text.lower() if ocr_text.strip() else ""
        
        # BOTTLE CLASSIFICATION - CHECK FOR PILL BOTTLES FIRST
        if 'bottle' in class_name_lower:
            # Use cached OCR to check if it's actually a pill bottle
            if ocr_text_lower:
                # Check for medicine/pill keywords in OCR text - EXPANDED LIST
                medicine_keywords = [
                    'mg', 'pill', 'tablet', 'vitamin', 'medicine', 'rx', 'dose', 'capsule', 
                    'ibuprofen', 'aspirin', 'tylenol', 'advil', 'aleve', 'motrin', 'bayer',
                    'prescription', 'drug', 'medication', 'supplement', 'capsules', 'pills',
                    'tablets', 'softgel', 'gel cap', 'gelcap', 'caplet', 'pharmacy', 'pharma',
                    'mcg', 'iu', 'international unit', 'milligram', 'microgram', 'dosage',
                    'strength', 'potency', 'expiry', 'exp', 'lot', 'ndc', 'usp', 'otc',
                    'take with food', 'take daily', 'twice daily', 'morning', 'evening',
                    'acetaminophen', 'naproxen', 'diphenhydramine', 'loratadine', 'cetirizine',
                    'omeprazole', 'ranitidine', 'simvastatin', 'lisinopril', 'metformin'
                ]
                if any(word in ocr_text_lower for word in medicine_keywords):
                    return 'pills'  # It's a pill bottle
            
            # If no pill keywords found, default to water bottle
            return 'water'
        
        # JUICE BOX PROTECTION - ALWAYS WATER
        if any(juice_word in class_name_lower for juice_word in ['juice', 'juicebox', 'juice box']):
            return 'water'  # All juice containers are always water
        if any(container_word in class_name_lower for container_word in ['box', 'carton', 'tetra']):
            return 'water'  # All boxes/cartons are juice boxes - always water
        
        # FILTER OUT BACKGROUND OBJECTS - MUCH MORE RELAXED FOR FOOD DETECTION
        if area < 800:  # Much lower threshold to catch muffins and small food items
            return 'unknown'  # Don't classify very small background objects
        
        # Additional background filtering based on position
        frame_height, frame_width = frame.shape[:2]
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2
        
        # Objects at edges are likely background - but be more lenient for center objects (near mouth)
        if (center_x < frame_width * 0.05 or center_x > frame_width * 0.95 or
            center_y < frame_height * 0.05 or center_y > frame_height * 0.95):
            if area < 5000:  # Much lower threshold for edge objects to catch muffins
                return 'unknown'
        
        # Special handling for objects in center region (likely near mouth during consuming)
        elif (frame_width * 0.2 < center_x < frame_width * 0.8 and 
              frame_height * 0.2 < center_y < frame_height * 0.8):
            # Objects in center region (near mouth) - be very permissive with small objects
            if area < 400:  # Very low threshold for center objects to catch muffins
                return 'unknown'
        
        # POSE-AWARE CLASSIFICATION: When consuming, prioritize pills, then food, then beverages
        if self.pose_status == "consuming":
            # Use cached OCR for classification
            if ocr_text_lower:
                # HIGHEST PRIORITY: Medicine keywords - pills stay pills
                medicine_keywords = [
                    'mg', 'pill', 'tablet', 'vitamin', 'medicine', 'rx', 'dose', 'capsule', 
                    'ibuprofen', 'aspirin', 'tylenol', 'advil', 'aleve', 'motrin', 'bayer',
                    'prescription', 'drug', 'medication', 'supplement', 'capsules', 'pills',
                    'tablets', 'softgel', 'gel cap', 'gelcap', 'caplet', 'pharmacy', 'pharma',
                    'mcg', 'iu', 'international unit', 'milligram', 'microgram', 'dosage',
                    'strength', 'potency', 'expiry', 'exp', 'lot', 'ndc', 'usp', 'otc'
                ]
                if any(word in ocr_text_lower for word in medicine_keywords):
                    return 'pills'  # Pills take priority even when consuming
                
                # SECOND PRIORITY: Food keywords - muffins stay food, never pills
                food_keywords = [
                    'muffin', 'cupcake', 'cake', 'bagel', 'pastry', 'croissant', 'danish', 'scone', 'biscuit',
                    'sandwich', 'burger', 'pizza', 'bread', 'donut', 'cookie', 'brownie', 'bar', 'energy bar',
                    'chips', 'crackers', 'cookies', 'cereal', 'snack', 'candy', 'chocolate', 'granola', 'pretzel',
                    'fruit', 'apple', 'banana', 'orange', 'grape', 'berry', 'nuts', 'trail mix', 'jerky',
                    'cheese', 'yogurt', 'pudding', 'ice cream', 'frozen', 'fresh', 'bakery', 'baked',
                    'wrapper', 'wrapped', 'packaging', 'packaged', 'food'
                ]
                if any(word in ocr_text_lower for word in food_keywords):
                    return 'food'  # Food items stay food, never pills
            
            # LOWEST PRIORITY: Check for drink containers (only if not pills or food)
            if any(keyword in class_name_lower for keyword in ['can', 'cup', 'mug', 'glass', 'container', 'box', 'carton', 'package']):
                return 'water'  # When consuming, remaining containers are beverages
            elif class_name_lower in ['can', 'cup', 'mug', 'glass', 'container', 'box', 'carton', 'package', 'bag']:
                return 'water'  # When consuming, treat remaining containers as beverages
        
        # STEP 0: FILTER OUT PEOPLE, BODY PARTS, AND WEARABLES
        if any(keyword in class_name_lower for keyword in ['person', 'people', 'human', 'man', 'woman', 'child', 'hand', 'arm', 'leg', 'foot', 'head', 'face', 'body', 'finger', 'palm', 'wrist', 'elbow', 'shoulder', 'torso', 'chest', 'back', 'neck', 'hair', 'skin', 'watch', 'strap', 'band', 'bracelet', 'wristband', 'belt', 'shoe', 'clothing']):
            return 'unknown'
        
        # STEP 1: STRICT CATEGORY CLASSIFICATION
        
        # WATER CATEGORY - All beverages, drinks, juice boxes (bottle check already done above)
        elif any(keyword in class_name_lower for keyword in ['water', 'drink', 'beverage', 'juice', 'soda', 'pop', 'cola', 'beer', 'juice box', 'juicebox', 'tetra pak', 'carton', 'milk']):
            return 'water'  # All beverages including juice boxes
        elif class_name_lower in ['can', 'water bottle', 'cup', 'mug', 'glass', 'carton', 'juice box', 'tetra pak']:
            return 'water'  # All drink containers including juice boxes
            
        # PILLS CATEGORY - Only medicine
        elif any(keyword in class_name_lower for keyword in ['pill', 'medicine', 'capsule', 'tablet', 'vitamin', 'medication', 'pharmacy', 'prescription', 'drug']):
            return 'pills'  # Only medicine-related items
            
        # FOOD CATEGORY - COMPREHENSIVE FOOD DETECTION INCLUDING WRAPPED ITEMS AND DEFAULT OBJECTS
        food_keywords = [
            'food', 'sandwich', 'pizza', 'apple', 'banana', 'bread', 'donut', 'cookie', 'chip', 'snack', 'fruit', 'vegetable',
            'muffin', 'cupcake', 'cake', 'bagel', 'pastry', 'croissant', 'danish', 'scone', 'biscuit', 'cracker',
            'burger', 'hamburger', 'cheeseburger', 'hotdog', 'taco', 'burrito', 'wrap', 'sub', 'hoagie',
            'salad', 'soup', 'pasta', 'spaghetti', 'noodles', 'rice', 'quinoa', 'oatmeal', 'cereal',
            'cheese', 'yogurt', 'pudding', 'jello', 'ice cream', 'popsicle', 'candy bar', 'chocolate',
            'granola', 'trail mix', 'nuts', 'peanuts', 'almonds', 'pretzels', 'popcorn', 'jerky',
            'wrapper', 'packaging', 'wrapped', 'packaged', 'foil', 'plastic wrap', 'peel', 'skin',
            'bakery', 'baked', 'fresh', 'homemade', 'frozen', 'ready to eat', 'snack pack'
        ]
        if any(keyword in class_name_lower for keyword in food_keywords):
            return 'food'  # Comprehensive food detection
        elif class_name_lower in ['bowl', 'plate', 'dining table', 'table']:
            return 'food'  # Food containers and surfaces
        
        # DEFAULT CLASSIFICATION FOR UNIDENTIFIED OBJECTS - PRIORITIZE FOOD
        # If it's not clearly pills or water, assume it could be food (especially for muffins)
        if not any(keyword in class_name_lower for keyword in ['bottle', 'can', 'cup', 'glass', 'drink', 'beverage']):
            # Check if it has food-like characteristics (medium size, not elongated)
            if 1000 < area < 20000 and aspect_ratio < 2.0:
                return 'food'  # Default medium-sized objects to food (catches muffins)
        
        # STEP 2: Handle generic "bottle" - already handled above
        
        # STEP 3: Handle packages/containers - ANGLE-INDEPENDENT WITH OCR
        elif class_name_lower in ['package', 'box', 'container', 'carton', 'bag', 'wrapper']:
            # Use cached OCR to identify package contents regardless of angle
            if ocr_text_lower:
                
                # Check for beverage keywords (juice boxes, milk, etc.)
                if any(word in ocr_text_lower for word in ['juice', 'milk', 'water', 'drink', 'soda', 'cola', 'beverage', 'apple juice', 'orange juice', 'grape juice']):
                    return 'water'
                
                # Check for food keywords - COMPREHENSIVE LIST INCLUDING MUFFINS AND WRAPPED ITEMS
                food_ocr_keywords = [
                    'chips', 'crackers', 'cookies', 'cereal', 'snack', 'candy', 'chocolate', 'granola', 'pretzel', 'popcorn',
                    'muffin', 'cupcake', 'cake', 'bagel', 'pastry', 'croissant', 'danish', 'scone', 'biscuit',
                    'sandwich', 'burger', 'pizza', 'bread', 'donut', 'cookie', 'brownie', 'bar', 'energy bar',
                    'fruit', 'apple', 'banana', 'orange', 'grape', 'berry', 'nuts', 'trail mix', 'jerky',
                    'cheese', 'yogurt', 'pudding', 'ice cream', 'frozen', 'fresh', 'bakery', 'baked',
                    'wrapper', 'wrapped', 'packaging', 'packaged', 'foil', 'plastic', 'peel', 'skin',
                    'hostess', 'little debbie', 'entenmann', 'pepperidge farm', 'nabisco', 'kellogg',
                    'organic', 'natural', 'gluten free', 'whole grain', 'multigrain', 'wheat', 'oat'
                ]
                if any(word in ocr_text_lower for word in food_ocr_keywords):
                    return 'food'
                
                # Check for medicine keywords
                if any(word in ocr_text_lower for word in ['pill', 'tablet', 'vitamin', 'medicine', 'capsule', 'mg']):
                    return 'pills'
            
            # Fallback shape-based detection - JUICE BOXES ARE NEVER PILLS
            # Cartons/boxes are usually beverages (juice boxes) - NEVER pills
            if 'carton' in class_name_lower:
                return 'water'  # ALL cartons are beverages
            elif 'box' in class_name_lower:
                return 'water'  # ALL boxes default to juice boxes (beverages)
            # Bags are usually food
            elif 'bag' in class_name_lower:
                return 'food'
            # Size-based fallback - bias toward beverages for rectangular packages
            elif aspect_ratio > 1.2:  # Rectangular packages = juice boxes
                return 'water'
            elif area > 15000:
                return 'food'  # Large packages = food
            else:
                return 'food'  # Default to food, not pills
        
        # STEP 4: Handle misclassified objects - OCR + SHAPE ANALYSIS
        elif class_name_lower in ['cell phone', 'remote', 'mouse', 'book', 'cylinder', 'jar', 'container', 'tube', 'object']:
            # Use cached OCR to identify what these actually are
            if ocr_text_lower:
                
                # Medicine containers (pill bottles, medicine jars) - COMPREHENSIVE CHECK
                medicine_keywords = [
                    'mg', 'pill', 'tablet', 'vitamin', 'medicine', 'rx', 'dose', 'capsule', 
                    'ibuprofen', 'aspirin', 'tylenol', 'advil', 'aleve', 'motrin', 'bayer',
                    'prescription', 'drug', 'medication', 'supplement', 'capsules', 'pills',
                    'tablets', 'softgel', 'gel cap', 'gelcap', 'caplet', 'pharmacy', 'pharma',
                    'mcg', 'iu', 'international unit', 'milligram', 'microgram', 'dosage',
                    'strength', 'potency', 'expiry', 'exp', 'lot', 'ndc', 'usp', 'otc'
                ]
                if any(word in ocr_text_lower for word in medicine_keywords):
                    return 'pills'
                
                # Food containers/packages - COMPREHENSIVE FOOD DETECTION
                food_ocr_keywords = [
                    'chips', 'crackers', 'cookies', 'cereal', 'snack', 'candy', 'chocolate', 'granola', 'pretzel', 'popcorn',
                    'muffin', 'cupcake', 'cake', 'bagel', 'pastry', 'croissant', 'danish', 'scone', 'biscuit',
                    'sandwich', 'burger', 'pizza', 'bread', 'donut', 'cookie', 'brownie', 'bar', 'energy bar',
                    'fruit', 'apple', 'banana', 'orange', 'grape', 'berry', 'nuts', 'trail mix', 'jerky',
                    'cheese', 'yogurt', 'pudding', 'ice cream', 'frozen', 'fresh', 'bakery', 'baked',
                    'wrapper', 'wrapped', 'packaging', 'packaged', 'foil', 'plastic', 'peel', 'skin',
                    'hostess', 'little debbie', 'entenmann', 'pepperidge farm', 'nabisco', 'kellogg',
                    'organic', 'natural', 'gluten free', 'whole grain', 'multigrain', 'wheat', 'oat', 'food'
                ]
                if any(word in ocr_text_lower for word in food_ocr_keywords):
                    return 'food'
                
                # Beverage containers (cans, bottles)
                if any(word in ocr_text_lower for word in ['cola', 'pepsi', 'coke', 'sprite', 'water', 'juice', 'soda', 'drink']):
                    return 'water'
            
            # Fallback shape-based detection
            # Jars are often medicine containers
            if 'jar' in class_name_lower:
                return 'pills' if area < 15000 else 'food'
            # Cylindrical objects
            elif 'cylinder' in class_name_lower:
                return 'pills' if area < 12000 else 'water'
            # Very elongated = cans
            elif aspect_ratio > 2.5:
                return 'water'
            # Small objects = pills
            elif area < 8000:
                return 'pills'
            
            return 'unknown'
        
        # STEP 5: Final categorization - OCR-ENHANCED DETECTION
        else:
            # Use cached OCR for unknown objects
            if ocr_text_lower:
                
                # Medicine/pill keywords take priority - COMPREHENSIVE CHECK
                medicine_keywords = [
                    'mg', 'pill', 'tablet', 'vitamin', 'medicine', 'rx', 'dose', 'capsule', 
                    'ibuprofen', 'aspirin', 'tylenol', 'advil', 'aleve', 'motrin', 'bayer',
                    'prescription', 'drug', 'medication', 'supplement', 'capsules', 'pills',
                    'tablets', 'softgel', 'gel cap', 'gelcap', 'caplet', 'pharmacy', 'pharma',
                    'mcg', 'iu', 'international unit', 'milligram', 'microgram', 'dosage',
                    'strength', 'potency', 'expiry', 'exp', 'lot', 'ndc', 'usp', 'otc'
                ]
                if any(word in ocr_text_lower for word in medicine_keywords):
                    return 'pills'
                
                # Beverage keywords
                if any(word in ocr_text_lower for word in ['water', 'juice', 'soda', 'cola', 'drink', 'beverage', 'ml', 'fl oz', 'liter']):
                    return 'water'
                
                # Food keywords - COMPREHENSIVE DETECTION INCLUDING MUFFINS AND WRAPPED ITEMS
                food_ocr_keywords = [
                    'chips', 'crackers', 'cookies', 'cereal', 'snack', 'candy', 'chocolate', 'granola', 'pretzel', 'popcorn',
                    'muffin', 'cupcake', 'cake', 'bagel', 'pastry', 'croissant', 'danish', 'scone', 'biscuit',
                    'sandwich', 'burger', 'pizza', 'bread', 'donut', 'cookie', 'brownie', 'bar', 'energy bar',
                    'fruit', 'apple', 'banana', 'orange', 'grape', 'berry', 'nuts', 'trail mix', 'jerky',
                    'cheese', 'yogurt', 'pudding', 'ice cream', 'frozen', 'fresh', 'bakery', 'baked',
                    'wrapper', 'wrapped', 'packaging', 'packaged', 'foil', 'plastic', 'peel', 'skin',
                    'hostess', 'little debbie', 'entenmann', 'pepperidge farm', 'nabisco', 'kellogg',
                    'organic', 'natural', 'gluten free', 'whole grain', 'multigrain', 'wheat', 'oat', 'food'
                ]
                if any(word in ocr_text_lower for word in food_ocr_keywords):
                    return 'food'
            
            # Shape-based fallback when OCR fails - AGGRESSIVE WATER/JUICE DETECTION
            # Any elongated object could be a bottle from any angle
            if aspect_ratio > 1.5:
                return 'water'  # All elongated objects = bottles/cans
            
            # Any rectangular object could be a juice box from any angle
            elif aspect_ratio > 1.2 and area > 3000:
                return 'water'  # All rectangular objects = juice boxes
            
            # Cylindrical objects that could be bottles viewed from top/bottom - IMPROVED PILL DETECTION
            elif 5000 < area < 30000 and aspect_ratio < 1.5:
                # Use cached OCR to check for medicine keywords first (more specific)
                if ocr_text_lower:
                    medicine_keywords = [
                        'mg', 'pill', 'tablet', 'vitamin', 'medicine', 'rx', 'dose', 'capsule', 
                        'ibuprofen', 'aspirin', 'tylenol', 'advil', 'aleve', 'motrin', 'bayer',
                        'prescription', 'drug', 'medication', 'supplement', 'capsules', 'pills',
                        'tablets', 'softgel', 'gel cap', 'gelcap', 'caplet', 'pharmacy', 'pharma',
                        'mcg', 'iu', 'international unit', 'milligram', 'microgram', 'dosage',
                        'strength', 'potency', 'expiry', 'exp', 'lot', 'ndc', 'usp', 'otc'
                    ]
                    if any(word in ocr_text_lower for word in medicine_keywords):
                        return 'pills'
                    elif any(word in ocr_text_lower for word in ['water', 'juice', 'soda', 'drink', 'cola', 'ml', 'oz']):
                        return 'water'
                
                # For cylindrical objects without clear OCR, check cached OCR for food keywords first
                # Smaller cylindrical objects could be food containers (like muffin cups) or pill bottles
                if area < 15000:
                    # Use cached OCR for food keywords to avoid misclassifying muffins as pills
                    if ocr_text_lower:
                        food_check_keywords = ['muffin', 'cupcake', 'cake', 'food', 'bakery', 'baked', 'pastry', 'snack']
                        if any(word in ocr_text_lower for word in food_check_keywords):
                            return 'food'  # Food items, not pills
                    return 'pills'  # Smaller cylinders = likely pill bottles (if not food)
                else:
                    return 'water'  # Larger cylinders = likely water bottles
            
            # Large objects = food (NEVER pills)
            elif area > 10000:
                return 'food'  # Large packages = food
            
            # Only medium-sized AND very cylindrical = pills (not background objects)
            elif 4000 < area < 12000 and aspect_ratio < 1.3:
                return 'pills'  # Only properly sized cylindrical objects = pills
            
            # Everything else defaults to food (ESPECIALLY for muffins)
            else:
                return 'food'  # Default everything else to food to catch muffins
    
    def detect_objects(self, frame: np.ndarray) -> List[Dict]:
        # Clear OCR cache when processing new frame
        self.cache_frame_count += 1
        if self.cache_frame_count % 100 == 0:  # Clear cache less frequently
            self.ocr_cache.clear()
        
        results = self.model(frame, verbose=False)
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = self.model.names[class_id]
                    
                    if confidence > 0.3:  # Lower threshold to catch muffins and other food items
                        bbox = (int(x1), int(y1), int(x2), int(y2))
                        object_type = self.classify_object(class_name, bbox, frame)
                        detections.append({
                            'bbox': bbox,
                            'confidence': float(confidence),
                            'class': class_name,
                            'object_type': object_type
                        })
        
        return detections
    
    def extract_text_from_region(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> str:
        x1, y1, x2, y2 = bbox
        
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
        
        roi = frame[y1:y2, x1:x2]
        
        if roi.size == 0 or roi.shape[0] < 15 or roi.shape[1] < 15:
            return ""  # Skip very small regions faster
        
        # Calculate area for performance check
        area = roi.shape[0] * roi.shape[1]
        
        # Skip OCR for very small regions to improve performance
        if area < 2000:
            return ""
        
        # Ultra-fast OCR with minimal processing
        try:
            # Resize for faster OCR processing
            if roi.shape[0] > 100 or roi.shape[1] > 100:
                scale = min(100/roi.shape[0], 100/roi.shape[1])
                new_width = int(roi.shape[1] * scale)
                new_height = int(roi.shape[0] * scale)
                roi = cv2.resize(roi, (new_width, new_height))
            
            roi_pil = Image.fromarray(cv2.cvtColor(roi, cv2.COLOR_BGR2RGB))
            
            # Fastest OCR configuration
            config = '--psm 8'
            
            try:
                text = pytesseract.image_to_string(roi_pil, config=config).strip()
                return text
            except:
                return ""
        except Exception:
            return ""
    
    
    def draw_detections(self, frame: np.ndarray, detections: List[Dict], show_ocr: bool = False) -> np.ndarray:
        annotated_frame = frame.copy()
        
        for detection in detections:
            object_type = detection['object_type']
            
            # ONLY draw boxes for the 3 categories you want - ignore everything else
            if object_type not in ['pills', 'water', 'food']:
                continue  # Skip unknown objects (including body parts) completely
            
            x1, y1, x2, y2 = detection['bbox']
            confidence = detection['confidence']
            
            # Colors for the 3 main categories
            if object_type == 'pills':
                color = (0, 165, 255)  # Orange for pills
            elif object_type == 'water':
                color = (255, 0, 0)    # Blue for water/drinks
            elif object_type == 'food':
                color = (0, 255, 0)    # Green for food items
            
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            label = f"{object_type} ({confidence:.2f})"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            cv2.rectangle(annotated_frame, (x1, y1-label_size[1]-10), (x1+label_size[0], y1), color, -1)
            cv2.putText(annotated_frame, label, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            if show_ocr:
                text = self.extract_text_from_region(frame, detection['bbox'])
                if text and len(text) > 2:
                    text_lines = text.split('\n')[:2]
                    for i, line in enumerate(text_lines):
                        if line.strip():
                            cv2.putText(annotated_frame, line[:20], (x1, y2+20+(i*20)), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
        
        return annotated_frame
    
    def process_pose_detection(self, frame: np.ndarray) -> np.ndarray:
        """Process pose detection and update status"""
        # Process pose detection
        frame = self.pose_detector.findPose(frame, draw=False)
        lmList = self.pose_detector.findPosition(frame, draw=False)
        current_time = time.time()
        
        
        # Track body presence for fall detection
        body_present = len(lmList) != 0
        
        if body_present:
            # Body is detected - update last detection time
            if not hasattr(self, 'last_body_detection_time'):
                self.last_body_detection_time = current_time
            elif self.pose_status == "body_missing":
                # Body reappeared after being missing
                time_missing = current_time - self.last_body_detection_time
                if time_missing < 3.0:  # If body was missing for less than 3 seconds
                    if (self.pose_status != "fallen" or 
                        current_time - self.last_pose_output_time > self.consumption_cooldown):
                        self.pose_status = "fallen"
                        print("fallen - body disappeared quickly")
                        self.last_pose_output_time = current_time
                        
                        # Send SMS alert for fall detection (async to avoid blocking)
                        #threading.Thread(target=self.sms_service.send_fall_alert_sms, args=(self.patient_id, "body disappeared quickly"), daemon=True).start()
                        
                        # Store fall event in MongoDB (async to avoid blocking)
                        insert_logs("fallen")
                        
            # Calculate head to foot distance (landmarks 2 and 27)
            headfoot = self.pose_detector.findDistance(frame, 2, 27)
            
            if headfoot > 150 and lmList[2][2] - lmList[27][2] < 15:
                # Check for consuming action (distance between ears)
                consuming = self.pose_detector.findDistance(frame, 9, 19)
                if consuming < 150:
                    new_status = "consuming"
                else: 
                    new_status = "standing"
                
                # Only output if status changed or 5 seconds have passed
                if (new_status != self.pose_status or 
                    current_time - self.last_pose_output_time > self.consumption_cooldown):
                    self.pose_status = new_status
                    print(self.pose_status)
                    self.last_pose_output_time = current_time
                else:
                    self.pose_status = new_status
            else:
                # Check for fallen state based on pose
                if current_time - self.pTime > 5:
                    if (self.pose_status != "fallen" or 
                        current_time - self.last_pose_output_time > self.consumption_cooldown):
                        self.pose_status = "fallen"
                        print("fallen - pose detection")
                        self.last_pose_output_time = current_time
                        
                        # Send SMS alert for fall detection (async to avoid blocking)
                        # threading.Thread(target=self.sms_service.send_fall_alert_sms, args=(self.patient_id, "pose detection"), daemon=True).start()
                        
                        # Store fall event in MongoDB (async to avoid blocking)
                        insert_logs("fallen")
                else:
                    self.pose_status = "idle"
                self.pTime = current_time
        else:
            # No body detected
            if hasattr(self, 'last_body_detection_time'):
                time_since_detection = current_time - self.last_body_detection_time
                if time_since_detection > 1.0:  # Body missing for more than 1 second
                    if self.pose_status not in ["fallen", "body_missing"]:
                        self.pose_status = "body_missing"
                        print("body_missing")
                        self.last_pose_output_time = current_time
            else:
                # First time no body detected
                self.last_body_detection_time = current_time
                self.pose_status = "body_missing"
        
        # Display pose status on frame
        cv2.putText(frame, f"Pose: {self.pose_status}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        
        return frame
    
    def get_meal_time(self):
        """Determine if it's breakfast, lunch, or dinner time"""
        current_hour = datetime.now().hour
        
        if 6 <= current_hour < 11:
            return "breakfast"
        elif 11 <= current_hour < 15:
            return "lunch"
        elif 17 <= current_hour < 21:
            return "dinner"
        else:
            return "snack"  # Outside meal times
    
    
    def check_consumption_event(self):
        """Check for consumption events and standing pill detection"""
        current_time = time.time()
        
        # Check what objects are currently detected
        detected_categories = set()
        for detection in self.last_detections:
            object_type = detection['object_type']
            if object_type in ['pills', 'water', 'food']:
                detected_categories.add(object_type)
        
        
        # Handle STANDING position - output pill message with day and meal time
        if (self.pose_status == "standing" and 
            'pills' in detected_categories and
            current_time - self.last_pill_output_time > self.consumption_cooldown):
            
            # Get current day of week and meal time
            day_of_week = datetime.now().strftime("%A")
            meal_time = self.get_meal_time()
            
            # Output formatted message
            print(f"pill - {day_of_week} {meal_time}")
            
            # Create voice announcement
            voice_message = f"It is {day_of_week} {meal_time}. Make sure to take the right pill."
            
            # Store pill reminder event in MongoDB (async to avoid lag)
            insert_logs("pill reminder")
            
            # NO SMS for pill reminders - only voice and console output
            
            # Speak the message in a separate thread to avoid blocking
            threading.Thread(target=self.speak_message, args=(voice_message,), daemon=True).start()
            
            self.last_pill_output_time = current_time
        
        # Handle CONSUMING position - output consumption messages
        elif self.pose_status == "consuming":
            
            # Output consumption messages based on detected categories
            for category in detected_categories:
                if category == 'pills':
                    if current_time - self.last_consumption_time > self.consumption_cooldown:
                        print("consumed pill")
                        
                        # Store consumption event in MongoDB (async to avoid lag)
                        insert_logs("consumed pill")
                        
                        # Send SMS for pill consumption (async to avoid lag)
                        # threading.Thread(target=self.sms_service.send_pill_consumed_sms, args=(self.patient_id,), daemon=True).start()
                        
                        self.last_consumption_time = current_time
                        break
                elif category == 'water':
                    if current_time - self.last_consumption_time > self.consumption_cooldown:
                        print("consumed water")
                        
                        # Store consumption event in MongoDB (async to avoid lag)
                        insert_logs("consumed water")
                        
                        # Send SMS for water consumption only every 30 seconds (async to avoid lag)
                        if current_time - self.last_water_sms_time > self.water_cooldown:
                            #threading.Thread(target=self.sms_service.send_water_consumed_sms, args=(self.patient_id,), daemon=True).start()
                            self.last_water_sms_time = current_time
                        
                        self.last_consumption_time = current_time
                        break
                elif category == 'food':
                    if current_time - self.last_food_consumption_time > self.food_cooldown:
                        print("ate food")
                        
                        # Store consumption event in MongoDB (async to avoid lag)
                        insert_logs("ate food")
                        
                        # Send SMS for food consumption only every 30 minutes (async to avoid lag)
                        if current_time - self.last_food_sms_time > self.food_cooldown:
                            #threading.Thread(target=self.sms_service.send_food_consumed_sms, args=(self.patient_id,), daemon=True).start()
                            self.last_food_sms_time = current_time
                        
                        self.last_food_consumption_time = current_time
                        break
    

    def speak_message(self, message: str):
        """Speak the given message using text-to-speech"""
        try:
            self.tts_engine.say(message)
            self.tts_engine.runAndWait()
        except Exception as e:
            print(f"TTS Error: {e}")

    def add_instructions(self, frame: np.ndarray) -> np.ndarray:
        height, width = frame.shape[:2]
        
        instructions = [
            "SPACE: Capture & OCR",
            "Q/ESC: Quit"
        ]
        
        for i, instruction in enumerate(instructions):
            cv2.putText(frame, instruction, (10, height - 40 + (i * 20)), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return frame
    
    def run(self):
        if not self.cap.isOpened():
            print("Error: Could not open camera")
            return
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                print("Error: Could not read frame")
                break
            
            self.frame_count += 1
            
            # Process object detection less frequently but pose detection every frame
            if self.frame_count % self.process_every_n_frames == 0:
                self.last_detections = self.detect_objects(frame)
            
            # Process pose detection first
            annotated_frame = self.process_pose_detection(frame)
            
            # Check for consumption events
            self.check_consumption_event()
            
            # Then process object detection
            annotated_frame = self.draw_detections(annotated_frame, self.last_detections, show_ocr=False)
            
            annotated_frame = self.add_instructions(annotated_frame)
            
            cv2.imshow('Live Camera OCR - Objects Detection', annotated_frame)
            
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q') or key == 27:
                break
            elif key == ord(' '):
                print("\n=== Capturing and Analyzing Frame ===")
                detections = self.detect_objects(frame)
                
                if detections:
                    ocr_frame = self.draw_detections(frame, detections, show_ocr=True)
                    cv2.imshow('OCR Results', ocr_frame)
                    
                    for i, detection in enumerate(detections, 1):
                        text = self.extract_text_from_region(frame, detection['bbox'])
                        print(f"Object {i}: {detection['object_type']} ({detection['confidence']:.2f})")
                        if text:
                            print(f"  Text: '{text}'")
                        else:
                            print("  Text: No text detected")
                        print()
                else:
                    print("No objects detected in current frame")
                    print()
        
        self.cleanup()
    
    def cleanup(self):
        # Store system shutdown event in MongoDB (async to avoid blocking)
        self.cap.release()
        cv2.destroyAllWindows()
        print("Camera OCR stopped")

def main():
    try:
        ocr_system = LiveCameraOCR()
        ocr_system.run()
    except KeyboardInterrupt:
        print("\nStopped by user")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()