'use client'
import { useEffect, useState } from 'react';

export default function HomeComponent() {
    const [user, setUser] = useState(null);
    const [showContent, setShowContent] = useState(false);
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        // Generate random values only on client side
        const newParticles = [...Array(5)].map((_, i) => ({
            id: i,
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
        }));
        setParticles(newParticles);
    }, []);

    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setTimeout(() => setShowContent(true), 300);
    }, []);

    return (
        <div className="w-full flex items-center justify-center flex-col min-h-[80vh] relative overflow-hidden">
            {/* Animated background blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute top-10 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-bounce" style={{ animationDuration: '4s' }}></div>
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '3s' }}></div>

            {/* Animated particles */}
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-bounce"
                    style={{
                        left: p.left,
                        top: p.top,
                        animationDelay: p.animationDelay,
                        animationDuration: p.animationDuration,
                    }}
                />
            ))}

            {/* Main Content */}
            <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 ease-out ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {/* Logo */}
                <div className="mb-8 p-4"                    >
                    <img style={{ animation: 'float 4s ease-in-out infinite' }} src='snowball.png' className="h-48 md:h-56  transition-all duration-500 transform hover:scale-105" alt="Snowball Logo" />
                </div>

                {/* Welcome Text */}
                <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 mb-4 text-center"
                    style={{ backgroundSize: '200% auto', animation: 'gradient 3s ease infinite' }}>
                    Welcome back, {user?.username || 'Admin'}!
                </h1>

                {/* Subtitle */}
                <p className={`text-xl text-gray-500 mb-8 text-center max-w-md transition-all duration-700 delay-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                    Manage your business with ease and efficiency
                </p>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-blue-300"></div>
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-blue-300"></div>
                </div>

                {/* Date */}
                <div className={`text-center transition-all duration-700 delay-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    <p className="text-3xl font-bold text-blue-600 animate-pulse" style={{ animationDuration: '3s' }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                {/* Loading dots */}
                <div className="flex gap-2 mt-8">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Inline styles for animations (no global CSS needed) */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes gradient {
                    0% { background-position: 0% center; }
                    50% { background-position: 100% center; }
                    100% { background-position: 0% center; }
                }
            `}</style>
        </div>
    );
}