import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';

const slides = [
  { title: "Welcome to Seyal", description: "Your social habit-tracking application using guilt mechanics, peer pressure, and AI to drive consistent behavior in groups." },
  { title: "Virtual Pets", description: "Keep your virtual pet healthy by staying consistent with your habits. Emotional accountability at its finest." },
  { title: "Group Boss", description: "Work together with your group to defeat bosses. Teamwork makes the dream work!" },
  { title: "AI Nudges", description: "Get personalized motivation and reminders from our AI to keep you on track." },
  { title: "External Integrations", description: "Automatically track your progress from GitHub, LeetCode, and Duolingo." },
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { user } = useAuth();

  const handleFinish = async () => {
    if (user) {
      await supabase.from('users').update({ has_seen_onboarding: true }).eq('id', user.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
      >
        <button onClick={handleFinish} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{slides[currentSlide].title}</h2>
          <p className="text-zinc-400">{slides[currentSlide].description}</p>
        </div>

        <div className="flex justify-between items-center">
          <button 
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="p-2 text-zinc-500 hover:text-white disabled:opacity-50"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === currentSlide ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
            ))}
          </div>

          {currentSlide === slides.length - 1 ? (
            <button onClick={handleFinish} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500">
              Get Started
            </button>
          ) : (
            <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} className="p-2 text-zinc-500 hover:text-white">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
