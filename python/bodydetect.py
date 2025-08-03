import cv2
import mediapipe as mp
import time
import math

class poseDetector():
    def __init__(self, mode=False, upBody=False, smooth=True,
                 detectionCon=0.5, trackCon=0.5):
        self.mode = mode
        self.upBody = upBody
        self.smooth = smooth
        self.detectionCon = detectionCon
        self.trackCon = trackCon
        self.mpDraw = mp.solutions.drawing_utils
        self.mpPose = mp.solutions.pose
        self.pose = self.mpPose.Pose(
            static_image_mode=self.mode,
            model_complexity=1,
            smooth_landmarks=self.smooth,
            enable_segmentation=False,
            smooth_segmentation=True,
            min_detection_confidence=self.detectionCon,
            min_tracking_confidence=self.trackCon
        )

    def findPose(self, img, draw=False):
        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.pose.process(imgRGB)
        if self.results.pose_landmarks:
            if draw:
                self.mpDraw.draw_landmarks(img, self.results.pose_landmarks,
                                           self.mpPose.POSE_CONNECTIONS)
        return img

    def findPosition(self, img, draw=False):
        self.lmList = []
        if self.results.pose_landmarks:
            for id, lm in enumerate(self.results.pose_landmarks.landmark):
                h, w, c = img.shape
                # print(id, lm)
                cx, cy = int(lm.x * w), int(lm.y * h)
                self.lmList.append([id, cx, cy])
                if draw:
                    cv2.circle(img, (cx, cy), 5, (255, 0, 0), cv2.FILLED)
        return self.lmList

    def findAngle(self, img, p1, p2, p3, draw=False):
        # Get the landmarks
        if len(self.lmList) == 0:
            return 0
            
        x1, y1 = self.lmList[p1][1:]
        x2, y2 = self.lmList[p2][1:]
        x3, y3 = self.lmList[p3][1:]
        # Calculate the Angle
        angle = math.degrees(math.atan2(y3 - y2, x3 - x2) -
                             math.atan2(y1 - y2, x1 - x2))
        if angle < 0:
            angle += 360
        # print(angle)
        # Draw
        if draw:
            cv2.line(img, (x1, y1), (x2, y2), (255, 255, 255), 3)
            cv2.line(img, (x3, y3), (x2, y2), (255, 255, 255), 3)
            cv2.circle(img, (x1, y1), 10, (0, 0, 255), cv2.FILLED)
            cv2.circle(img, (x1, y1), 15, (0, 0, 255), 2)
            cv2.circle(img, (x2, y2), 10, (0, 0, 255), cv2.FILLED)
            cv2.circle(img, (x2, y2), 15, (0, 0, 255), 2)
            cv2.circle(img, (x3, y3), 10, (0, 0, 255), cv2.FILLED)
            cv2.circle(img, (x3, y3), 15, (0, 0, 255), 2)
            cv2.putText(img, str(int(angle)), (x2 - 50, y2 + 50),
                        cv2.FONT_HERSHEY_PLAIN, 2, (0, 0, 255), 2)
        return angle

    def findDistance(self, img, p1, p2, draw=True):
        """Calculate Euclidean distance between two landmarks"""
        if len(self.lmList) == 0:
            return 0
            
        x1, y1 = self.lmList[p1][1:]
        x2, y2 = self.lmList[p2][1:]
        
        # Calculate Euclidean distance
        distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        
        # Draw line between points
        if draw:
            cv2.line(img, (x1, y1), (x2, y2), (0, 255, 0), 3)
            cv2.circle(img, (x1, y1), 10, (255, 0, 0), cv2.FILLED)
            cv2.circle(img, (x2, y2), 10, (255, 0, 0), cv2.FILLED)
            # Display distance in the middle of the line
        
        return distance

def main():
    # Use webcam instead of video file
    cap = cv2.VideoCapture(0)
    pTime = 0
    detector = poseDetector()
    
    while True:
        success, img = cap.read()
        if not success:
            print("Failed to grab frame")
            break
            
        img = detector.findPose(img)
        lmList = detector.findPosition(img, draw=False)

        if len(lmList) != 0:
            headfoot = detector.findDistance(img, 2, 27)
            if headfoot > 150 and lmList[2][2] - lmList[27][2] < 15:
                consuming = detector.findDistance(img, 9, 19)
                if consuming < 150:
                    print("consuming")
                else: 
                    print("standing")
            else:
                if time.time() - pTime > 5:
                    print("FALL DETECTED!")
                    # Trigger emergency notification with location
                    try:
                        # Import SMS service to trigger emergency call
                        import sys
                        import os
                        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                        from services.sms_service import SMSService
                        
                        sms_service = SMSService()
                        
                        # Get location (placeholder - in real implementation, get GPS location)
                        location = "Emergency location detected by fall detection camera"  # Replace with actual GPS
                        
                        # Trigger emergency call and SMS
                        success = sms_service.trigger_emergency_call("Patient", location)
                        
                        if success:
                            print("✅ Emergency notification sent successfully!")
                        else:
                            print("⚠️ Emergency notification may have failed")
                            
                    except Exception as e:
                        print(f"❌ Error triggering emergency notification: {e}")
                    
                    pTime = time.time()
                pTime = time.time()
                
        cv2.imshow("Pose Detection", img)
        
        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()