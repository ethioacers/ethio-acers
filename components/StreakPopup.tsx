 "use client";

 import { useEffect, useMemo } from "react";
 import { Button } from "@/components/ui/button";

 type Props = {
   streak: number;
   onClose: () => void;
 };

 const MESSAGES = [
   "Keep it up, you're on fire!",
   "Consistency is the key to success!",
   "One step closer to your goals!",
   "Champions never stop learning!",
   "You're building a winning habit!",
 ];

 export function StreakPopup({ streak, onClose }: Props) {
   const message = useMemo(
     () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
     []
   );

   useEffect(() => {
     const id = setTimeout(onClose, 5000);
     return () => clearTimeout(id);
   }, [onClose]);

   return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
       <div className="w-full max-w-sm rounded-xl border border-gold bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95 duration-300">
         <div className="flex flex-col items-center gap-3 text-center">
           <div className="text-5xl" aria-hidden>
             🔥
           </div>
           <p className="text-xl font-bold text-gold">
             🔥 {streak} Day Streak!
           </p>
           <p className="text-sm text-muted-foreground">{message}</p>
           <Button
             type="button"
             className="mt-2 w-full sm:w-auto bg-gold text-black hover:bg-gold/90"
             onClick={onClose}
           >
             Keep Going!
           </Button>
         </div>
       </div>
     </div>
   );
 }

