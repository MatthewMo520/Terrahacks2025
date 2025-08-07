export default function WelcomeBanner({ userName, brandName }) {
  return (
    <div className="bg-[#C8B5E8] rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back, {userName}</h1>
      <p className="text-lg text-gray-700">{brandName}</p>
    </div>
  )
} 