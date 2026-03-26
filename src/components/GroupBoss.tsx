import { Flame, Skull, Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import confetti from 'canvas-confetti';

interface GroupBossProps {
  groupId: string;
  name: string;
  hp: number;
  maxHp: number;
}

export default function GroupBoss({ groupId, name, hp, maxHp }: GroupBossProps) {
  const [isSummoning, setIsSummoning] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<{id: number, amount: number}[]>([]);
  const prevHpRef = useRef(hp);
  const { sendNotification } = useNotifications();
  const { user } = useAuth();

  const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isDefeated = hp <= 0;

  useEffect(() => {
    if (hp < prevHpRef.current) {
      // Boss took damage!
      const damage = prevHpRef.current - hp;
      setIsHit(true);
      
      const id = Date.now();
      setDamageNumbers(prev => [...prev, { id, amount: damage }]);
      
      // Check if boss was just defeated
      if (hp <= 0 && prevHpRef.current > 0) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#ffffff']
        });
        
        sendNotification('Boss Defeated!', {
          body: `Your group has defeated ${name}! Great teamwork.`,
          icon: '/favicon.ico'
        });

        // Award 500 XP to the current user for contributing to the boss defeat
        if (user) {
          supabase.from('xp_ledger').insert([{
            user_id: user.id,
            amount: 500,
            reason: 'Boss Defeat Contribution'
          }]).then(({ error }) => {
            if (error) console.error("Error awarding boss defeat XP:", error);
          });
        }
      }
      
      // Reset hit animation state
      const hitTimer = setTimeout(() => setIsHit(false), 400);
      // Remove floating text after animation
      const textTimer = setTimeout(() => {
        setDamageNumbers(prev => prev.filter(d => d.id !== id));
      }, 1500);

      return () => {
        clearTimeout(hitTimer);
        clearTimeout(textTimer);
      };
    }
    prevHpRef.current = hp;
  }, [hp, user, name]);

  const summonNextBoss = async () => {
    setIsSummoning(true);
    try {
      const newMaxHp = Math.floor(maxHp * 1.5); // 50% stronger
      const bossNames = [
        "The Procrastination Demon",
        "The Doomscroller",
        "The Motivation Vampire",
        "The Couch Potato King",
        "The Distraction Dragon"
      ];
      const randomName = bossNames[Math.floor(Math.random() * bossNames.length)];

      await supabase
        .from('groups')
        .update({
          boss_hp: newMaxHp,
          boss_max_hp: newMaxHp,
          boss_name: randomName
        })
        .eq('id', groupId);
    } catch (error) {
      console.error("Error summoning boss:", error);
    } finally {
      setIsSummoning(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden h-full min-h-[400px]">
      {/* Background glow based on state */}
      <div className={`absolute inset-0 opacity-10 blur-2xl transition-colors duration-1000 ${
        isDefeated ? 'bg-emerald-500' : isHit ? 'bg-red-600' : 'bg-purple-600'
      }`} />

      <h2 className="text-xl font-semibold mb-6 text-white relative z-10">Group Enemy</h2>
      
      <div className="relative mb-6 z-10">
        {/* Floating Damage Numbers */}
        <AnimatePresence>
          {damageNumbers.map((dmg, i) => (
            <motion.div
              key={dmg.id}
              initial={{ opacity: 0, y: 0, scale: 0.5, x: (i % 2 === 0 ? -20 : 20) }}
              animate={{ opacity: 1, y: -60, scale: 1.5, x: (i % 2 === 0 ? -40 : 40) }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-black text-2xl z-50 pointer-events-none drop-shadow-md"
            >
              -{dmg.amount}
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.div 
          animate={
            isDefeated 
              ? { scale: [1, 1.2, 0], rotate: [0, 180, 360], opacity: 0 } 
              : isHit 
                ? { x: [-10, 10, -10, 10, 0], filter: "brightness(1.5) hue-rotate(-50deg)" } 
                : { y: [-5, 5, -5] }
          }
          transition={
            isDefeated 
              ? { duration: 0.8, ease: "easeInOut" } 
              : isHit 
                ? { duration: 0.4 } 
                : { repeat: Infinity, duration: 4, ease: "easeInOut" }
          }
          className={`w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-2xl transition-colors duration-300 ${
            isDefeated 
              ? 'bg-zinc-900 border-emerald-500/50' 
              : isHit 
                ? 'bg-red-950 border-red-500' 
                : 'bg-zinc-950 border-purple-500/50'
          }`}
        >
          {isDefeated ? (
            <Trophy className="w-16 h-16 text-emerald-500" />
          ) : (
            <Flame className={`w-16 h-16 ${isHit ? 'text-red-500' : 'text-purple-500'}`} />
          )}
        </motion.div>

        {/* Defeated Trophy Replacement */}
        {isDefeated && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
            className="absolute inset-0 w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-2xl bg-zinc-900 border-emerald-500/50 mx-auto"
          >
            <Trophy className="w-16 h-16 text-emerald-500" />
          </motion.div>
        )}
        
        {/* Boss HP Badge */}
        <motion.div 
          animate={isHit ? { scale: [1, 1.2, 1] } : {}}
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-bold text-sm border-2 border-zinc-900 whitespace-nowrap z-20 ${
            isDefeated ? 'bg-emerald-500 text-zinc-900' : isHit ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'
          }`}
        >
          {hp} / {maxHp} HP
        </motion.div>
      </div>

      <h3 className={`font-bold text-2xl mb-2 relative z-10 transition-colors ${isDefeated ? 'text-emerald-400 line-through opacity-70' : isHit ? 'text-red-400' : 'text-purple-400'}`}>
        {name}
      </h3>
      
      <p className="text-zinc-400 text-sm mb-6 max-w-[250px] relative z-10">
        {isDefeated 
          ? "Your group has defeated the enemy! Great teamwork." 
          : "Complete your daily habits to deal damage to the boss!"}
      </p>
      
      {/* Boss HP Bar */}
      <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden relative z-10 border border-zinc-800 mb-4">
        <motion.div 
          initial={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
          className={`h-full ${
            isDefeated ? 'bg-emerald-500' : isHit ? 'bg-red-500' : 'bg-purple-500'
          }`}
        />
      </div>

      {isDefeated && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          onClick={summonNextBoss}
          disabled={isSummoning}
          className="relative z-10 mt-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full shadow-lg transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSummoning ? 'animate-spin' : ''}`} />
          Summon Next Boss
        </motion.button>
      )}
    </div>
  );
}
