import { Heart, Skull, AlertTriangle, Smile } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../hooks/useNotifications';

interface PetProps {
  hp: number;
  state: string;
  username: string;
  isOwner: boolean;
  avatarUrl?: string | null;
  petName?: string | null;
  petType?: string | null;
}

export default function Pet({ hp, state, username, isOwner, avatarUrl, petName, petType }: PetProps) {
  const [hpChangeNumbers, setHpChangeNumbers] = useState<{id: number, amount: number, type: 'heal' | 'damage'}[]>([]);
  const [isHit, setIsHit] = useState(false);
  const [isHealed, setIsHealed] = useState(false);
  const prevHpRef = useRef(hp);
  const { sendNotification } = useNotifications();

  const displayName = petName || `${username}'s Pet`;
  const type = petType || 'dog';

  useEffect(() => {
    if (hp !== prevHpRef.current) {
      const diff = hp - prevHpRef.current;
      const type = diff > 0 ? 'heal' : 'damage';
      
      if (type === 'damage') setIsHit(true);
      if (type === 'heal') setIsHealed(true);
      
      const id = Date.now();
      setHpChangeNumbers(prev => [...prev, { id, amount: Math.abs(diff), type }]);
      
      if (hp <= 0 && prevHpRef.current > 0 && isOwner) {
        sendNotification(`Oh no! ${displayName} died.`, {
          body: 'You missed too many habits. Your pet has perished.',
          icon: '/favicon.ico'
        });
      }

      const animTimer = setTimeout(() => {
        setIsHit(false);
        setIsHealed(false);
      }, 400);
      
      const textTimer = setTimeout(() => {
        setHpChangeNumbers(prev => prev.filter(d => d.id !== id));
      }, 1500);

      return () => {
        clearTimeout(animTimer);
        clearTimeout(textTimer);
      };
    }
    prevHpRef.current = hp;
  }, [hp, displayName]);

  // Determine visual styles based on HP
  let bgColor = 'bg-zinc-900/50';
  let borderColor = 'border-zinc-800';
  let statusText = 'Happy';
  let statusColor = 'text-emerald-500';
  let petColor = 'bg-emerald-500';

  // Base colors from reference images
  const baseColors: Record<string, string> = {
    dog: 'bg-amber-700',
    cat: 'bg-orange-500',
    bird: 'bg-blue-500',
    fish: 'bg-sky-400',
    snake: 'bg-emerald-500'
  };

  petColor = baseColors[type] || 'bg-emerald-500';

  if (hp <= 0) {
    bgColor = 'bg-zinc-950';
    borderColor = 'border-zinc-900';
    statusText = 'Dead';
    statusColor = 'text-zinc-600';
    petColor = 'bg-zinc-700';
  } else if (hp < 40) {
    bgColor = 'bg-red-950/20';
    borderColor = 'border-red-900/30';
    statusText = 'Critical';
    statusColor = 'text-red-500';
  } else if (hp < 70) {
    bgColor = 'bg-yellow-950/20';
    borderColor = 'border-yellow-900/30';
    statusText = 'Hurt';
    statusColor = 'text-yellow-500';
  }

  // Character Animation Variants - Professional Studio Quality with Squash & Stretch
  const bodyVariants: any = {
    idle: {
      y: [0, -2, 0],
      scaleY: [1, 1.01, 0.99, 1],
      transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
    },
    happy: {
      y: [0, -6, 0],
      scaleY: [1, 0.95, 1.05, 1],
      scaleX: [1, 1.05, 0.95, 1],
      transition: { repeat: Infinity, duration: 1.2, ease: "circInOut" }
    },
    hurt: {
      x: [-1, 1, -1, 1, 0],
      scale: [1, 0.98, 1.02, 1],
      transition: { repeat: Infinity, duration: 0.4 }
    },
    dead: {
      rotate: [-1, 1, -1],
      y: [1, 2, 1],
      opacity: 0.7,
      transition: { repeat: Infinity, duration: 6, ease: "easeInOut" }
    }
  };

  const eyeVariants: any = {
    blink: {
      scaleY: [1, 1, 0, 1, 1],
      transition: { repeat: Infinity, duration: 5, times: [0, 0.85, 0.88, 0.91, 1] }
    }
  };

  const renderPetBody = () => {
    const isDead = hp <= 0;
    const isHurt = hp < 70;
    const isCritical = hp < 40;
    const isHappy = hp >= 90;

    // Professional Studio Face
    const Face = ({ eyeColor = 'bg-zinc-900', type: faceType = 'normal' }) => (
      <div className="flex flex-col items-center gap-1 z-40">
        <div className="flex gap-3.5">
          <motion.div variants={eyeVariants} animate="blink" className={`w-3 h-3 ${eyeColor} rounded-full relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]`}>
            {isDead ? (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90">×</span>
            ) : (
              <>
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full opacity-95 shadow-sm" />
                <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white/50 rounded-full" />
              </>
            )}
          </motion.div>
          <motion.div variants={eyeVariants} animate="blink" className={`w-3 h-3 ${eyeColor} rounded-full relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]`}>
            {isDead ? (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90">×</span>
            ) : (
              <>
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full opacity-95 shadow-sm" />
                <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white/50 rounded-full" />
              </>
            )}
          </motion.div>
        </div>
        {faceType === 'cat' && (
          <div className="w-2 h-1.5 bg-pink-400/90 rounded-full mt-[-4px] shadow-sm border border-pink-500/20" />
        )}
        <motion.div 
          animate={isCritical ? { scaleX: 0.4, height: 5, borderRadius: '50%' } : isHappy ? { scaleX: 1.4, height: 2, borderRadius: '0 0 10px 10px' } : { scaleX: 0.8, height: 2 }} 
          className={`w-5 bg-zinc-900/80 rounded-full ${isCritical ? 'border-2 border-zinc-900/30' : ''}`} 
        />
      </div>
    );

    const baseColor = isDead ? 'bg-zinc-600' : petColor;
    
    // Advanced Lighting Overlays
    const RimLight = () => <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 rounded-[inherit] pointer-events-none z-10" />;
    const SoftVolume = () => <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-black/20 rounded-[inherit] pointer-events-none z-10" />;
    const AmbientOcclusion = () => <div className="absolute inset-0 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)] rounded-[inherit] pointer-events-none z-10" />;

    // Professional Studio Effects
    const Shadow = () => (
      <motion.div
        animate={{
          scale: isHappy ? [1, 1.2, 1] : [1, 1.05, 1],
          opacity: isHappy ? [0.2, 0.1, 0.2] : [0.2, 0.15, 0.2],
        }}
        transition={{ duration: bodyVariants[isDead ? 'dead' : isHappy ? 'happy' : isHurt ? 'hurt' : 'idle'].transition.duration, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-[50%] blur-md z-0"
      />
    );

    const Particles = () => {
      if (isHappy) {
        return (
          <div className="absolute -top-12 inset-x-0 flex justify-center pointer-events-none">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0, scale: 0 }}
                animate={{ y: -40, opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8], x: (i - 2) * 20 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                className="text-red-400 text-xl"
              >
                ♥
              </motion.div>
            ))}
          </div>
        );
      }
      if (isHurt && !isDead) {
        return (
          <div className="absolute top-0 right-0 pointer-events-none">
            <motion.div
              animate={{ y: [0, 10], opacity: [0, 1, 0], x: [0, 5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-3 bg-blue-300 rounded-full"
            />
          </div>
        );
      }
      return null;
    };

    const renderPetContent = () => {
      switch(type) {
      case 'dog':
        return (
          <div className="relative flex flex-col items-center scale-[0.7] origin-center">
            {/* Ears - Organic Secondary Motion */}
            <motion.div 
              animate={{ rotate: isHappy ? [-15, 15, -15] : [-3, 3, -3], y: isHappy ? [0, -2, 0] : 0 }} 
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              className={`absolute -top-8 -left-6 w-14 h-24 ${baseColor} rounded-[45%_45%_25%_85%] origin-top-right border-r-2 border-black/15 shadow-xl z-10`}
            >
              <div className="absolute inset-3 bg-pink-900/20 rounded-[inherit] blur-[2px]" />
              <RimLight />
              <SoftVolume />
            </motion.div>
            <motion.div 
              animate={{ rotate: isHappy ? [15, -15, 15] : [3, -3, 3], y: isHappy ? [0, -2, 0] : 0 }} 
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              className={`absolute -top-8 -right-6 w-14 h-24 ${baseColor} rounded-[45%_45%_85%_25%] origin-top-left border-l-2 border-black/15 shadow-xl z-10`}
            >
              <div className="absolute inset-3 bg-pink-900/20 rounded-[inherit] blur-[2px]" />
              <RimLight />
              <SoftVolume />
            </motion.div>
            
            {/* Head */}
            <div className={`w-32 h-28 ${baseColor} rounded-[48%_48%_40%_40%] relative z-30 flex flex-col items-center justify-center shadow-2xl border-b-4 border-black/20`}>
              <SoftVolume />
              <RimLight />
              <AmbientOcclusion />
              <Face />
              {/* Muzzle */}
              <div className="w-16 h-12 bg-white/30 rounded-[50%] mt-1.5 flex flex-col items-center border border-black/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] relative overflow-hidden">
                <div className="w-6 h-4 bg-zinc-900 rounded-full mt-2 shadow-lg relative">
                  <div className="absolute top-0.5 right-1.5 w-1.5 h-1 bg-white/40 rounded-full" />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className={`w-34 h-24 ${baseColor} rounded-[35%_35%_55%_55%] mt-[-18px] relative z-20 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-b-8 border-black/25`}>
              <SoftVolume />
              <RimLight />
              <AmbientOcclusion />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-full bg-white/15 rounded-full blur-[3px]" />
              {/* Tail - High Frequency Secondary Motion */}
              <motion.div 
                animate={{ rotate: isHappy ? [-45, 45, -45] : [-10, 10, -10] }} 
                transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }} 
                className={`absolute -right-6 top-5 w-14 h-6 ${baseColor} rounded-full origin-left border-2 border-black/15 shadow-lg`}
              >
                <RimLight />
                <SoftVolume />
              </motion.div>
            </div>

            {/* Paws */}
            <div className="flex gap-16 mt-[-10px] z-30">
              <div className="w-10 h-6 bg-white/95 rounded-t-full border-2 border-black/20 shadow-xl relative">
                <div className="absolute bottom-0 w-full h-1.5 bg-black/10 rounded-full" />
              </div>
              <div className="w-10 h-6 bg-white/95 rounded-t-full border-2 border-black/20 shadow-xl relative">
                <div className="absolute bottom-0 w-full h-1.5 bg-black/10 rounded-full" />
              </div>
            </div>
          </div>
        );
      case 'cat':
        return (
          <div className="relative flex flex-col items-center scale-[0.7] origin-center">
            {/* Ears */}
            <div className="absolute -top-10 w-full flex justify-between px-1 z-10">
              <motion.div 
                animate={{ rotate: isHappy ? [-8, 8, -8] : 0, y: isHappy ? [-2, 2, -2] : 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`w-14 h-16 ${baseColor} rounded-[100%_0%_0%_0%] rotate-[-15deg] border-r-2 border-black/15 shadow-xl relative overflow-hidden`}
              >
                <div className="absolute top-4 left-4 w-8 h-12 bg-pink-400/30 rounded-full blur-[2px]" />
                <RimLight />
                <SoftVolume />
              </motion.div>
              <motion.div 
                animate={{ rotate: isHappy ? [8, -8, 8] : 0, y: isHappy ? [-2, 2, -2] : 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`w-14 h-16 ${baseColor} rounded-[0%_100%_0%_0%] rotate-[15deg] border-l-2 border-black/15 shadow-xl relative overflow-hidden`}
              >
                <div className="absolute top-4 right-4 w-8 h-12 bg-pink-400/30 rounded-full blur-[2px]" />
                <RimLight />
                <SoftVolume />
              </motion.div>
            </div>

            {/* Head */}
            <div className={`w-30 h-26 ${baseColor} rounded-[48%_48%_44%_44%] relative z-30 flex items-center justify-center shadow-2xl border-b-4 border-black/20`}>
              <SoftVolume />
              <RimLight />
              <AmbientOcclusion />
              <Face eyeColor="bg-blue-600" type="cat" />
              {/* Whiskers */}
              <div className="absolute -left-12 top-1/2 flex flex-col gap-2 opacity-50">
                <div className="w-12 h-0.5 bg-zinc-900/40 rotate-[-15deg] rounded-full" />
                <div className="w-12 h-0.5 bg-zinc-900/40 rounded-full" />
                <div className="w-12 h-0.5 bg-zinc-900/40 rotate-[15deg] rounded-full" />
              </div>
              <div className="absolute -right-12 top-1/2 flex flex-col gap-2 opacity-50">
                <div className="w-12 h-0.5 bg-zinc-900/40 rotate-[15deg] rounded-full" />
                <div className="w-12 h-0.5 bg-zinc-900/40 rounded-full" />
                <div className="w-12 h-0.5 bg-zinc-900/40 rotate-[-15deg] rounded-full" />
              </div>
            </div>

            {/* Body */}
            <div className={`w-24 h-32 ${baseColor} rounded-[45%_45%_35%_35%] mt-[-12px] relative z-20 shadow-[0_15px_40px_rgba(0,0,0,0.35)] border-b-8 border-black/25`}>
              <SoftVolume />
              <RimLight />
              <AmbientOcclusion />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-20 bg-white/15 rounded-full blur-[4px]" />
              {/* Tail - Fluid Secondary Motion */}
              <motion.div 
                animate={{ rotate: isHappy ? [-30, 30, -30] : [-8, 8, -8], scaleY: [1, 1.1, 1] }} 
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
                className={`absolute -right-14 bottom-10 w-20 h-6 ${baseColor} rounded-full origin-left rotate-[-45deg] border-2 border-black/15 shadow-xl`}
              >
                <RimLight />
                <SoftVolume />
              </motion.div>
            </div>
          </div>
        );
      case 'bird':
        return (
          <div className="relative flex flex-col items-center scale-[0.65] origin-center">
            {/* Crest */}
            <div className="absolute -top-8 flex gap-2 z-10">
              <motion.div animate={{ rotate: [-25, -15, -25], scaleY: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className={`w-4 h-12 ${baseColor} rounded-full border-2 border-black/15 shadow-md`} />
              <motion.div animate={{ rotate: [25, 15, 25], scaleY: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className={`w-4 h-12 ${baseColor} rounded-full border-2 border-black/15 shadow-md`} />
            </div>

            {/* Wings - High Speed Secondary Motion */}
            <motion.div 
              animate={{ rotate: isHappy ? [0, -60, 0] : [0, -15, 0], scale: isHappy ? [1, 1.1, 1] : 1 }} 
              transition={{ duration: 0.2, repeat: Infinity, ease: "easeInOut" }} 
              className={`absolute top-12 -left-14 w-16 h-14 ${baseColor} rounded-[100%_0%_100%_0%] origin-right border-r-4 border-black/15 shadow-2xl z-10`}
            >
              <RimLight />
              <SoftVolume />
            </motion.div>
            <motion.div 
              animate={{ rotate: isHappy ? [0, 60, 0] : [0, 15, 0], scale: isHappy ? [1, 1.1, 1] : 1 }} 
              transition={{ duration: 0.2, repeat: Infinity, ease: "easeInOut" }} 
              className={`absolute top-12 -right-14 w-16 h-14 ${baseColor} rounded-[0%_100%_0%_100%] origin-left border-l-4 border-black/15 shadow-2xl z-10`}
            >
              <RimLight />
              <SoftVolume />
            </motion.div>

            {/* Body */}
            <div className={`w-32 h-36 ${baseColor} rounded-[45%_45%_50%_50%] relative z-30 flex items-center justify-center shadow-[0_15px_45px_rgba(0,0,0,0.4)] overflow-hidden border-b-8 border-black/25`}>
              <SoftVolume />
              <RimLight />
              <AmbientOcclusion />
              <div className="absolute bottom-0 w-full h-1/2 bg-yellow-400/80 rounded-t-full blur-[2px]" />
              <div className="flex flex-col items-center z-40">
                <Face />
                {/* Beak */}
                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-orange-500 mt-2 shadow-xl relative">
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-white/40 rounded-full blur-[0.5px]" />
                </div>
              </div>
            </div>

            {/* Tail */}
            <div className="flex gap-2 mt-[-10px] z-20">
              <motion.div animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 1.5, repeat: Infinity }} className={`w-6 h-14 ${baseColor} rounded-b-full border-2 border-black/15 shadow-xl`} />
              <motion.div animate={{ rotate: [10, -10, 10] }} transition={{ duration: 1.5, repeat: Infinity }} className={`w-6 h-14 ${baseColor} rounded-b-full border-2 border-black/15 shadow-xl`} />
            </div>
          </div>
        );
      case 'fish':
        return (
          <div className="relative flex items-center justify-center scale-[0.7] origin-center w-48 h-32">
            {/* Tail Fin - Refined Shape and Motion */}
            <motion.div 
              animate={{ 
                rotateY: [0, 20, 0, -20, 0],
                x: [0, 2, 0, 2, 0]
              }} 
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} 
              className={`absolute right-2 w-14 h-20 ${baseColor} rounded-[10%_90%_90%_10%] border-r-4 border-black/10 origin-left shadow-lg z-10`}
              style={{ perspective: 1000 }}
            >
              <div className="absolute inset-0 bg-white/10 rounded-[inherit]" />
              <RimLight />
              <SoftVolume />
              {/* Fin Rays */}
              <div className="absolute inset-0 flex flex-col justify-around py-2 px-1 opacity-20">
                <div className="h-0.5 w-full bg-black/20 rounded-full" />
                <div className="h-0.5 w-full bg-black/20 rounded-full" />
                <div className="h-0.5 w-full bg-black/20 rounded-full" />
              </div>
            </motion.div>

            {/* Dorsal Fin - More triangular/curved */}
            <motion.div 
              animate={{ skewX: [-3, 3, -3], scaleY: [1, 1.03, 1] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className={`absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-12 ${baseColor} rounded-[100%_20%_0%_0%] border-t-2 border-black/10 z-20`}
            >
              <RimLight />
              <SoftVolume />
            </motion.div>
            
            {/* Body - More tapered and sculpted */}
            <div className={`w-38 h-24 ${baseColor} rounded-[50%_100%_100%_50%] relative z-30 flex items-center justify-center shadow-xl border-b-4 border-black/20 overflow-hidden`}>
              <SoftVolume />
              <RimLight />
              <AmbientOcclusion />
              
              {/* Scales/Patterns - More subtle */}
              <div className="absolute inset-0 flex justify-around px-8 opacity-10 pointer-events-none">
                <div className="w-4 h-full bg-white rotate-12 blur-[2px]" />
                <div className="w-4 h-full bg-white rotate-12 blur-[2px]" />
              </div>

              {/* Face - Properly scaled and centered */}
              <div className="translate-x-[-12px] scale-[1.2] z-50">
                <Face eyeColor="bg-sky-950" />
              </div>
              
              {/* Gill Detail */}
              <div className="absolute left-8 top-1/2 -translate-y-1/2 w-1 h-8 bg-black/10 rounded-full blur-[0.5px]" />
            </div>

            {/* Pectoral Fin - Side fin */}
            <motion.div 
              animate={{ rotate: [-5, 15, -5], scale: [1, 1.05, 1] }} 
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} 
              className="absolute bottom-6 left-10 w-10 h-8 bg-white/20 rounded-full border border-white/30 backdrop-blur-[1px] z-40 shadow-sm" 
            />
          </div>
        );
      case 'snake':
        return (
          <div className="relative flex flex-col items-center scale-[0.6] origin-center">
            {/* Head */}
            <div className={`w-28 h-24 ${baseColor} rounded-[48%_48%_35%_35%] relative z-40 flex items-center justify-center shadow-2xl border-b-4 border-black/20`}>
              <SoftVolume />
              <RimLight />
              <AmbientOcclusion />
              <div className="absolute bottom-0 w-full h-1/3 bg-yellow-200/30 rounded-b-2xl blur-[0.5px]" />
              <Face />
              {/* Tongue - Snappy Secondary Motion */}
              <motion.div 
                animate={{ scaleY: [0, 1.4, 0], y: [0, 4, 0], rotate: [-5, 5, -5] }} 
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, ease: "backOut" }} 
                className="absolute -bottom-12 w-3 h-14 bg-red-600 rounded-full flex flex-col items-center z-50 shadow-lg"
              >
                <div className="w-6 h-2.5 bg-red-600 mt-auto rounded-full shadow-md" />
              </motion.div>
            </div>

            {/* Body Segments - Complex Sine Wave Animation */}
            <div className="flex flex-col items-center mt-[-15px]">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <motion.div 
                  key={i}
                  animate={{ 
                    x: isHappy ? [-22, 22, -22] : [-10, 10, -10],
                    scale: [1, 1.05, 1],
                    rotate: isHappy ? [-5, 5, -5] : 0
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  className={`${i === 7 ? 'w-8 h-8' : i === 6 ? 'w-12 h-10' : i === 5 ? 'w-16 h-12' : i === 4 ? 'w-20 h-14' : i === 3 ? 'w-24 h-16' : 'w-28 h-18'} ${baseColor} rounded-[45%_45%_55%_55%] border-b-4 border-black/15 mt-[-16px] shadow-2xl relative overflow-hidden`}
                >
                  <SoftVolume />
                  <RimLight />
                  <AmbientOcclusion />
                  <div className="absolute bottom-0 w-full h-1/3 bg-yellow-200/20" />
                  <div className="absolute top-4 left-8 w-5 h-5 bg-black/10 rounded-full blur-[1px]" />
                </motion.div>
              ))}
            </div>
          </div>
        );
      default:
        return <div className={`w-20 h-20 ${baseColor} rounded-full shadow-2xl border-b-8 border-black/25`} />;
      }
    };

    return (
      <div className="relative">
        <Particles />
        <motion.div
          variants={bodyVariants}
          animate={isDead ? 'dead' : isHappy ? 'happy' : isHurt ? 'hurt' : 'idle'}
          className="relative z-10"
        >
          {renderPetContent()}
        </motion.div>
        <Shadow />
      </div>
    );
  };

  return (
    <div className={`relative p-6 rounded-2xl border ${bgColor} ${borderColor} transition-all duration-500 flex flex-col items-center justify-center text-center shadow-2xl group`}>
      {/* Background Glow */}
      <div className={`absolute inset-0 opacity-10 blur-3xl transition-colors duration-500 rounded-2xl overflow-hidden ${
        isHit ? 'bg-red-500' : isHealed ? 'bg-emerald-500' : petColor
      }`} />

      {isOwner && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded uppercase tracking-widest z-10 border border-emerald-500/20">
          You
        </div>
      )}
      
      <div className="mb-4 relative z-10 h-40 flex items-center justify-center w-full">
        {/* Floating HP Numbers */}
        <AnimatePresence>
          {hpChangeNumbers.map((change, i) => (
            <motion.div
              key={change.id}
              initial={{ opacity: 0, y: 0, scale: 0.5, x: (i % 2 === 0 ? -20 : 20) }}
              animate={{ opacity: 1, y: -60, scale: 1.5, x: (i % 2 === 0 ? -40 : 40) }}
              exit={{ opacity: 0, y: -80 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`absolute font-black text-2xl z-50 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
                change.type === 'heal' ? 'text-emerald-400' : 'text-red-500'
              }`}
            >
              {change.type === 'heal' ? '▲' : '▼'} {change.amount}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* The Cartoon Character */}
        {renderPetBody()}
        
        {/* HP Badge */}
        <motion.div 
          animate={(isHit || isHealed) ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
          className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-xl font-black text-xs border-2 border-zinc-950 z-20 shadow-lg ${
            hp > 70 ? 'bg-emerald-500 text-zinc-950' : 
            hp > 40 ? 'bg-yellow-500 text-zinc-950' : 
            'bg-red-500 text-white'
          }`}
        >
          {hp}%
        </motion.div>
      </div>

      <div className="space-y-1 relative z-10">
        <h3 className="font-bold text-lg text-white tracking-tight">{displayName}</h3>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${statusColor}`}>{statusText}</p>
      </div>
      
      {/* HP Bar */}
      <div className="w-full h-3 bg-zinc-950 rounded-full mt-5 overflow-hidden border border-zinc-800 p-0.5">
        <motion.div 
          initial={{ width: `${Math.max(0, Math.min(100, hp))}%` }}
          animate={{ width: `${Math.max(0, Math.min(100, hp))}%` }}
          transition={{ type: "spring", bounce: 0.2, duration: 1 }}
          className={`h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
            hp > 70 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 
            hp > 40 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 
            'bg-gradient-to-r from-red-600 to-red-400'
          }`}
        />
      </div>
    </div>
  );
}
