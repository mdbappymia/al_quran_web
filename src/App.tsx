import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
// import './App.css'
import allSurah from './assets/all_surah.json';


interface Ayah {
  surahName: string;
  surahNameArabic: string;
  surahNo: number;
  ayahNo: number;
  english: string;
  arabic1: string;
  arabic2: string;
  bengali: string;
  audio: { url: string }[];
}

function App() {
  const [currentSurah, setCurrentSurah] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [ayat, setAyat] = useState<Ayah[]>([]);
  const [totalAyat, setTotalAyat] = useState(0);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const itemsPerPage = totalAyat > 7 ? 7 : totalAyat;

  useEffect(() => {
    const loadAyat = async () => {
      try {
        const startAyah = (currentPage - 1) * itemsPerPage + 1;
        const endAyah = Math.min(startAyah + itemsPerPage - 1, totalAyat);
        const promises = [];
        for (let i = startAyah; i <= endAyah; i++) {
          const response = fetch(`/src/assets/ayath/${currentSurah}/${i}.json`)
            .then(res => res.ok ? res.json() : null);
          promises.push(response);
        }
        const results = await Promise.all(promises);
        setAyat(results.filter(result => result !== null));
        if (totalAyat === 0) {
          const firstAyah = await fetch(`/src/assets/ayath/${currentSurah}/1.json`).then(res => res.json());
          setTotalAyat(firstAyah.totalAyah);
        }
      } catch (error) {
        console.error('Error loading ayat:', error);
      }
    };

    loadAyat();
  }, [currentSurah, currentPage, totalAyat, itemsPerPage]);

  useEffect(() => {
    audioRefs.current = audioRefs.current.slice(0, ayat.length);
  }, [ayat]);

  const handleAudioPlay = (index: number) => {
    audioRefs.current.forEach((audio, i) => {
      if (audio && i !== index) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  };

  const handleAudioEnd = (index: number) => {
    if (index < audioRefs.current.length - 1 && audioRefs.current[index + 1]) {
      audioRefs.current[index + 1]?.play();
    }
  };

  const totalPages = Math.ceil(totalAyat / itemsPerPage);

  return (
    <div className='container mx-auto'>
      <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-w-80 bg-white shadow-lg flex flex-col"
      >
        <div className="p-6 flex-1">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L1 12H4V21H20V12H23L12 2Z" className="fill-emerald-600"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Al-Quran
            </h1>
          </motion.div>
          <div className="space-y-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-gray-700">
                Select Surah
              </label>
              <select
                className="w-full rounded-lg border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                value={currentSurah.toString()}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setCurrentSurah(Number(e.target.value));
                  setCurrentPage(1);
                  setTotalAyat(0);
                }}
              >
                
                {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}. {allSurah[num - 1].surahName}
                  </option>
                ))}
              </select>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-emerald-700">Current Page</span>
                  <span className="text-sm font-medium text-emerald-900">{currentPage} of {totalPages}</span>
                </div>
                <div className="mt-2 h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentPage / totalPages) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex justify-center items-center"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <input
                  type="number"
                  className="w-full text-center border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-emerald-500"
                  value={currentPage}
                  onChange={(e) => {
                    const page = Math.max(1, Math.min(totalPages, Number(e.target.value)));
                    setCurrentPage(page);
                  }}
                />
                <button
                  className="hover:bg-emerald-700 shadow-sm flex justify-center items-center"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="overflow-auto m-5 w-full">
        <div className="w-full mx-auto space-y-6 h-screen overflow-auto">
          {ayat.map((ayah, index) => (
            <motion.div
              key={`${ayah.surahNo}_${ayah.ayahNo}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg m-6 p-5 hover:shadow-xl transition-shadow duration-300 border-4 border-gray-200 border-gradient-to-r from-green-400 via-blue-500 to-purple-600"
              
            >
              <div style={{ padding: '20px' }}>
                {/* Arabic Text Section */}
              <div className="border-b border-gray-100 pb-4 w-full">
                <p dir="rtl" lang="ar" className="font-arabic text-right text-3xl leading-relaxed">
                  {ayah.arabic1}
                </p>
              </div>
              
              {/* Translations Section */}
              <div className="mt-4 space-y-4">
                {/* English Translation */}
                <div className="text-left">
                  <p className="text-lg text-gray-900 leading-relaxed">
                    {ayah.english}
                  </p>
                </div>
                
                {/* Bengali Translation */}
                <div className="text-left">
                  <p className="text-md text-gray-700 leading-relaxed">
                    {ayah.bengali}
                  </p>
                </div>

                {/* Audio Section */}
                <div className="mt-4">
                  <audio
                    controls
                    className="w-full"
                    ref={el => {
                      audioRefs.current[index] = el;
                    }}
                    onPlay={() => handleAudioPlay(index)}
                    onEnded={() => handleAudioEnd(index)}
                  >
                    <source src={ayah.audio[3].url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center text-xs pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-emerald-50 rounded-full font-medium">
                      {ayah.surahName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="font-medium">
                      Ayah {ayah.ayahNo} of {totalAyat}
                    </span>
                  </div>
                </div>
              </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}

export default App
