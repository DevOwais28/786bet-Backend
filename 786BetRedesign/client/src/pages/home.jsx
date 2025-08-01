import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { Toaster } from 'react-hot-toast';
import { ArrowRight, Bell, Zap, Shield, Users, Coins, Trophy, TrendingUp, Sparkles, Rocket, Gift, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const aviatorImages = [
  {
    id: 1,
    src: "https://media.gettyimages.com/id/1954370076/photo/young-men-using-smart-phone-for-sports-betting.jpg?s=612x612&w=0&k=20&c=L9jVhAj_edGqEENHijSZ5ACImlGAc2Zlczk7596lA8o=",
    alt: "Betting app"
  },
  {
    id: 2,
    src: "https://media.istockphoto.com/id/693041112/photo/online-casino-concept-laptop-roulette-slot-machine-chips-and-cards.jpg?s=612x612&w=0&k=20&c=vYa8kEnpczH2309Jy7hNshl4I1UOgIq5a-f4LvblCzg=",
    alt: "Win easy money!"
  },
  {
    id: 3,
    src: "https://blog.championbetgh.com/wp-content/uploads/2023/07/aviator.png",
    alt: "Finger tapping the green CASH-OUT button on phone"
  },
  {
    id: 4,
    src: "https://images.sftcdn.net/images/t_app-cover-l,f_auto/p/d2bea513-24a5-4917-b26e-ce6c79216f0f/2867233137/aviator-game-bmb-screenshot.png",
    alt: "winning too much?"
  },
];
  const Hero = () => {
    return (
      
      <section className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 relative overflow-hidden">
        {/* Enhanced background with animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                x: [0, 100, 0],
                y: [0, 50, 0],
                opacity: [0.1, 0.5, 0.1],
              }}
              transition={{
                duration: 10 + Math.random() * 20,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute rounded-full bg-amber-400/20"
              style={{
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl w-full flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-10 relative z-10 py-20">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight"
            >
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                Premium Aviator
              </span>
              <br />
              <span className="text-white">Gaming Experience</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-6 max-w-xl text-lg md:text-xl text-gray-300"
            >
              The ultimate crash game with instant payouts, high multipliers, and fair gameplay.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
            >
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-amber-400 to-rose-500 text-black font-bold px-8 py-3 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 text-lg"
                >
                  Start Playing Now
                </motion.button>
              </Link>
              <Link to="/how-to-play">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-transparent border-2 border-amber-400 text-amber-400 font-bold px-8 py-3 rounded-xl hover:bg-amber-400/10 text-lg"
                >
                  How To Play
                </motion.button>
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-gradient-to-br from-amber-400/10 to-amber-600/10 rounded-full flex items-center justify-center border-2 border-amber-400/30">
              <div className="w-3/4 h-3/4 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full flex items-center justify-center border border-amber-400/30">
                <Rocket className="w-24 h-24 text-amber-400 animate-pulse" />
              </div>
            </div>
            <Sparkles className="absolute top-0 left-0 text-amber-400 animate-pulse" size={48} />
            <Sparkles className="absolute bottom-0 right-0 text-amber-400 animate-pulse" size={48} />
          </motion.div>
        </div>
      </section>
    );
  };
  
  const AviatorCarousel = () => {
    const settings = {
      dots: true,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 3000,
      pauseOnHover: true,
      arrows: true,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            arrows: false,
          }
        },
        {
          breakpoint: 768,
          settings: {
            arrows: false,
            dots: false
          }
        }
      ]
    };
  
    return (
      <section className="py-12 md:py-16 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="mx-auto max-w-3xl text-center mb-8 md:mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white"
            >
              <span className="text-amber-400">Aviator</span> In Action
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-gray-300"
            >
              See the excitement of our premium Aviator game
            </motion.p>
          </div>
  
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl lg:max-w-5xl mx-auto"
          >
            <div className="px-2 sm:px-4">
              <Slider {...settings} className="aviator-slider">
                {aviatorImages.map((image) => (
                  <div key={image.id} className="px-1 sm:px-2 outline-none focus:outline-none">
                    <div className="relative rounded-lg md:rounded-xl overflow-hidden shadow-lg hover:shadow-amber-400/20 transition-all duration-300 aspect-video">
                      <img 
                        src={image.src} 
                        alt={image.alt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4 md:p-6">
                        <div className="text-white">
                          <h3 className="text-lg sm:text-xl font-bold">{image.alt}</h3>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
            
            {/* Custom arrow styles */}
            <style jsx="true" global="true">{`
              .aviator-slider {
                position: relative;
              }
              .aviator-slider .slick-prev:before, 
              .aviator-slider .slick-next:before {
                color: #f59e0b;
                font-size: 28px;
              }
              .aviator-slider .slick-dots {
                bottom: -35px;
              }
              .aviator-slider .slick-dots li {
                margin: 0 4px;
              }
              .aviator-slider .slick-dots li button:before {
                color: #f59e0b;
                opacity: 0.5;
                font-size: 10px;
              }
              .aviator-slider .slick-dots li.slick-active button:before {
                color: #f59e0b;
                opacity: 1;
              }
              .aviator-slider .slick-prev {
                left: -35px;
              }
              .aviator-slider .slick-next {
                right: -35px;
              }
              @media (max-width: 1024px) {
                .aviator-slider .slick-prev {
                  left: -25px;
                }
                .aviator-slider .slick-next {
                  right: -25px;
                }
              }
              @media (max-width: 768px) {
                .aviator-slider .slick-prev {
                  left: -15px;
                }
                .aviator-slider .slick-next {
                  right: -15px;
                }
                .aviator-slider .slick-dots {
                  bottom: -30px;
                }
              }
              @media (max-width: 640px) {
                .aviator-slider .slick-prev:before,
                .aviator-slider .slick-next:before {
                  font-size: 24px;
                }
              }
            `}</style>
          </motion.div>
        </div>
      </section>
    );
  };
  const Features = () => {
    const features = [
      { icon: Zap, title: 'Instant Payouts', desc: 'Withdraw your winnings immediately', color: 'from-blue-400 to-cyan-400' },
      { icon: ShieldCheck, title: 'Provably Fair', desc: 'Verifiably random results', color: 'from-emerald-400 to-teal-400' },
      { icon: Users, title: 'Live Community', desc: 'Play with thousands worldwide', color: 'from-violet-400 to-purple-400' },
      { icon: Coins, title: 'Low Fees', desc: 'Keep more of your winnings', color: 'from-rose-400 to-pink-400' },
      { icon: Trophy, title: 'Big Wins', desc: 'Massive jackpots daily', color: 'from-amber-400 to-orange-400' },
      { icon: Gift, title: 'Bonuses', desc: 'Daily rewards & promotions', color: 'from-indigo-400 to-blue-400' },
    ];

    return (
      <section className="py-24 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5"></div>
        
        <div className="relative mx-auto max-w-7xl px-6 z-10">
          <div className="mx-auto max-w-3xl text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Why Choose <span className="text-amber-400">786Bet</span>?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-6 text-lg md:text-xl text-gray-300"
            >
              The premier destination for crash game enthusiasts
            </motion.p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative rounded-2xl bg-gray-800/50 backdrop-blur-sm p-8 border border-gray-700 hover:border-amber-400/50 transition-all"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className="relative z-10">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-r ${feature.color} text-white mb-6`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-gray-400">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const HowItWorks = () => {
    const steps = [
      { 
        step: 1, 
        title: 'Create Account', 
        desc: 'Sign up in under 30 seconds', 
        icon: <Users className="h-6 w-6" />,
        color: 'from-blue-500 to-cyan-500'
      },
      { 
        step: 2, 
        title: 'Make Deposit', 
        desc: 'Add funds instantly with crypto', 
        icon: <Coins className="h-6 w-6" />,
        color: 'from-purple-500 to-violet-500'
      },
      { 
        step: 3, 
        title: 'Start Playing', 
        desc: 'Place bets & cash out at the right time', 
        icon: <Rocket className="h-6 w-6" />,
        color: 'from-amber-500 to-orange-500'
      },
    ];

    return (
      <section className="py-24 bg-gradient-to-b from-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern-dark.svg')] bg-repeat opacity-5"></div>
        
        <div className="relative mx-auto max-w-7xl px-6 z-10">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              How To <span className="text-amber-400">Play</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-6 text-lg md:text-xl text-gray-300"
            >
              Get started in just 3 simple steps
            </motion.p>
          </div>

          <div className="relative">
            <div className="absolute hidden md:block h-1 w-full top-1/2 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 rounded-full opacity-20"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.2 }}
                  className="relative group"
                >
                  <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r ${step.color} opacity-0 group-hover:opacity-30 blur transition duration-500`}></div>
                  <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 h-full border border-gray-700 group-hover:border-amber-400/50 transition-all">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r ${step.color} text-white font-bold text-2xl mb-6`}>
                      {step.icon}
                    </div>
                    <h3 className="text-2xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-3 text-gray-400">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const Leaderboard = () => {
    const topPlayers = [
      { rank: 1, name: 'CryptoKing', payout: 2340.5, avatar: '🥇', color: 'bg-gradient-to-r from-amber-400 to-yellow-500' },
      { rank: 2, name: 'LuckyStreak', payout: 1890.25, avatar: '🥈', color: 'bg-gradient-to-r from-gray-400 to-gray-500' },
      { rank: 3, name: 'MoonRider', payout: 1545.75, avatar: '🥉', color: 'bg-gradient-to-r from-amber-600 to-orange-500' },
      { rank: 4, name: 'AceHunter', payout: 1230.0, avatar: '👤', color: 'bg-gradient-to-r from-purple-500 to-violet-500' },
      { rank: 5, name: 'SkyWalker', payout: 980.5, avatar: '👤', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    ];

    return (
      <section className="py-12 md:py-24 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          <div className="mx-auto max-w-3xl text-center mb-12 md:mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white"
            >
              Today's <span className="text-amber-400">Top Winners</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-gray-300"
            >
              Join our winners circle and be the next big winner
            </motion.p>
          </div>

          <div className="mx-auto max-w-2xl lg:max-w-4xl space-y-3 sm:space-y-4">
            {topPlayers.map((player, idx) => (
              <motion.div
                key={player.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="relative rounded-lg md:rounded-xl bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 flex items-center gap-4 sm:gap-6 hover:shadow-[0_0_20px_rgba(250,204,21,0.1)] transition-all"
              >
                <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full ${player.color} text-white text-xl sm:text-2xl`}>
                  {player.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-base sm:text-lg truncate">{player.name}</div>
                  <div className="text-xs sm:text-sm text-gray-400">Rank #{player.rank}</div>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-400 whitespace-nowrap">
                  ${player.payout.toFixed(2)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };


  const CTA = () => {
    return (
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5"></div>
        
        <div className="relative mx-auto max-w-7xl px-6 z-10">
          <div className="mx-auto max-w-4xl text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold text-white mb-8"
            >
              Ready to <span className="text-amber-400">Start Winning</span>?
            </motion.h2>
            
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold px-8 py-4 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 text-lg"
                >
                  Join Now - It's Free
                </motion.button>
              </Link>
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-transparent border-2 border-amber-400 text-amber-400 font-bold px-8 py-4 rounded-xl hover:bg-amber-400/10 text-lg"
                >
                  Existing User? Sign In
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    );
  };

  const Footer = () => {
    return (
      <footer className="border-t border-gray-800 bg-gray-900 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">786Bet</h3>
              <p className="text-gray-400">The premier crash game platform with fair play and instant payouts.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-amber-400 transition-colors">Home</Link></li>
                <li><Link to="/game" className="text-gray-400 hover:text-amber-400 transition-colors">Play Now</Link></li>
                <li><Link to="/how-to-play" className="text-gray-400 hover:text-amber-400 transition-colors">How To Play</Link></li>
                <li><Link to="/leaderboard" className="text-gray-400 hover:text-amber-400 transition-colors">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="/terms" className="text-gray-400 hover:text-amber-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-amber-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/responsible-gaming" className="text-gray-400 hover:text-amber-400 transition-colors">Responsible Gaming</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
              <ul className="space-y-2">
                <li><Link to="/support" className="text-gray-400 hover:text-amber-400 transition-colors">Support</Link></li>
                <li><Link to="/faq" className="text-gray-400 hover:text-amber-400 transition-colors">FAQ</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-amber-400 transition-colors">About Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} 786Bet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  };

  export default function HomePage() {
    return (
      <>
        <Toaster position="top-center" />
        <Header showFullNavigation />
        <Hero />
        <Features />
        <AviatorCarousel />
        <HowItWorks />
        <Leaderboard />
        <CTA />
        <Footer />
      </>
    );
  }