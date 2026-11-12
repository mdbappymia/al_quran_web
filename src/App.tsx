import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import allSurah from "./assets/all_surah.json";
import allReciters from "./assets/reciter_list.json";
import crestIcon from "./assets/icon.png";

interface Ayah {
  surahName: string;
  surahNameArabic: string;
  surahNo: number;
  ayahNo: number;
  english: string;
  arabic1: string;
  arabic2: string;
  bengali: string;
  audio: Record<string, { reciter: string; url: string }>;
}

// Add useWidth hook
function useWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

function App() {
  const width = useWidth();
  const isDesktop = width >= 1024;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSurah, setCurrentSurah] = useState(() => {
    const saved = localStorage.getItem("currentSurah");
    return saved ? Number(saved) : 1;
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem("currentPage");
    return saved ? Number(saved) : 1;
  });
  const [ayat, setAyat] = useState<Ayah[]>([]);
  const [totalAyat, setTotalAyat] = useState(() => {
    const saved = localStorage.getItem("totalAyat");
    return saved ? Number(saved) : 0;
  });
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemsPerPage = totalAyat > 7 ? 7 : totalAyat;
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Add new states for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSurahs, setFilteredSurahs] = useState(allSurah);

  // Add state for page number input
  const [pageInput, setPageInput] = useState(currentPage.toString());

  // Add state for showing suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef = useRef<HTMLDivElement>(null);

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Add state for auto-play
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  // Add state for continuous surah playback
  const [playContinuous, setPlayContinuous] = useState(false);

  // Add new state for global audio control
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);
  const lastPlayedAudioRef = useRef<{
    index: number;
    audio: HTMLAudioElement | null;
  }>({ index: -1, audio: null });
  // Reciter state
  const [reciter, setReciter] = useState(() => {
    const saved = localStorage.getItem("currentReciter");
    return saved || allReciters[0];
  });

  const surahMeta = allSurah[currentSurah - 1];

  // Save reciter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("currentReciter", reciter);
  }, [reciter]);

  // Get audio URL based on reciter
  const getAudioUrl = (ayah: Ayah, selectedReciter: string) => {
    switch (selectedReciter) {
      case "Mishary Rashid Al-Afasy":
        return ayah.audio[1].url;
      case "Abu Bakr Al-Shatri":
        return ayah.audio[2].url;
      case "Nasser Al Qatami":
        return ayah.audio[3].url;
      case "Saood ash Shuraym":
        return `https://everyayah.com/data/Saood_ash-Shuraym_64kbps/${String(
          ayah?.surahNo
        ).padStart(3, "0")}${String(ayah?.ayahNo).padStart(3, "0")}.mp3`;
      case "Abdul Rahman Al-Sudais":
        return `https://everyayah.com/data/Abdurrahmaan_As-Sudais_64kbps/${String(
          ayah?.surahNo
        ).padStart(3, "0")}${String(ayah?.ayahNo).padStart(3, "0")}.mp3`;
      default:
        return ayah.audio[1].url; // Default to Mishary Rashid Al-Afasy
    }
  };

  // Update audio sources when reciter changes
  useEffect(() => {
    audioRefs.current.forEach((audioRef, index) => {
      if (audioRef && ayat[index]) {
        const newUrl = getAudioUrl(ayat[index], reciter);
        if (audioRef.src !== newUrl) {
          audioRef.src = newUrl;
          audioRef.load(); // Reload the audio element with new source
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciter, ayat]);

  // Handle keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < filteredSurahs.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const surahIndex = allSurah.findIndex(
            (s) => s === filteredSurahs[selectedSuggestionIndex]
          );
          handleSuggestionClick(surahIndex + 1);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [searchQuery]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("currentSurah", currentSurah.toString());
  }, [currentSurah]);

  useEffect(() => {
    localStorage.setItem("currentPage", currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem("totalAyat", totalAyat.toString());
  }, [totalAyat]);

  useEffect(() => {
    const loadAyat = async () => {
      try {
        const startAyah = (currentPage - 1) * itemsPerPage + 1;
        const endAyah = Math.min(startAyah + itemsPerPage - 1, totalAyat);
        const promises = [];
        for (let i = startAyah; i <= endAyah; i++) {
          const response = fetch(
            `/ayath/${currentSurah}/${i}.json`
          ).then((res) => (res.ok ? res.json() : null));
          promises.push(response);
        }
        const results = await Promise.all(promises);
        setAyat(results.filter((result) => result !== null));
        if (totalAyat === 0) {
          const firstAyah = await fetch(
            `/ayath/${currentSurah}/1.json`
          ).then((res) => res.json());
          setTotalAyat(firstAyah.totalAyah);
        }
      } catch (error) {
        console.error("Error loading ayat:", error);
      }
    };

    loadAyat();
  }, [currentSurah, currentPage, totalAyat, itemsPerPage, reciter]);
  useEffect(() => {
    audioRefs.current = audioRefs.current.slice(0, ayat.length);
  }, [ayat]);

  useEffect(() => {
    ayahRefs.current = ayahRefs.current.slice(0, ayat.length);
  }, [ayat]);

  // Update filtered surahs when search query changes
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredSurahs(allSurah); // Show all surahs when search is empty
      return;
    }
    const filtered = allSurah.filter((surah, index) => {
      const surahNumber = (index + 1).toString();
      const surahName = surah.surahName.toLowerCase();
      const searchTerms = query.split(" ");

      return searchTerms.every(
        (term) => surahName.includes(term) || surahNumber.includes(term)
      );
    });
    setFilteredSurahs(filtered);
  }, [searchQuery]);

  // Handle page number input change
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPageInput(value);
  };

  // Handle page number input blur
  const handlePageInputBlur = () => {
    const pageNumber = parseInt(pageInput) || currentPage;
    const newPage = Math.min(Math.max(1, pageNumber), totalPages);
    setCurrentPage(newPage);
    setPageInput(newPage.toString());
    scrollToTop();
  };

  // Handle page number input keydown
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputBlur();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (surahNumber: number) => {
    setCurrentSurah(surahNumber);
    setCurrentPage(1);
    setPageInput("1");
    setTotalAyat(0);
    setShowSuggestions(false);
    setSearchQuery("");
    scrollToTop();
    if (width < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const scrollToAyah = (index: number) => {
    ayahRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // Update handleAudioPlay to track last played audio
  const handleAudioPlay = (index: number) => {
    const currentAudio = audioRefs.current[index];
    audioRefs.current.forEach((audio, i) => {
      if (audio && i !== index) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    if (currentAudio) {
      lastPlayedAudioRef.current = { index, audio: currentAudio };
      setIsGlobalPlaying(true);
    }
    setPlayingAyah(index);
    scrollToAyah(index);
  };

  // Update handleGlobalPlayPause to handle first-time play
  const handleGlobalPlayPause = () => {
    const { audio, index } = lastPlayedAudioRef.current;

    // If no audio was previously playing, start from the first ayah
    if (!audio || index === -1) {
      const firstAudio = audioRefs.current[0];
      if (firstAudio) {
        firstAudio.play();
        lastPlayedAudioRef.current = { index: 0, audio: firstAudio };
        setIsGlobalPlaying(true);
        setPlayingAyah(0);
        scrollToAyah(0);
      }
      return;
    }

    // Handle pause/play for currently playing audio
    if (isGlobalPlaying) {
      audio.pause();
      setIsGlobalPlaying(false);
      setPlayingAyah(null);
    } else {
      audio.play();
      setIsGlobalPlaying(true);
      setPlayingAyah(index);
      scrollToAyah(index);
    }
  };

  // Update handleAudioPause
  const handleAudioPause = () => {
    setIsGlobalPlaying(false);
    setPlayingAyah(null);
  };

  // Update handleAudioEnd
  const handleAudioEnd = (index: number) => {
    if (index < audioRefs.current.length - 1) {
      // If there are more audios on current page
      const nextAudio = audioRefs.current[index + 1];
      if (nextAudio) {
        nextAudio.play();
        lastPlayedAudioRef.current = { index: index + 1, audio: nextAudio };
        setIsGlobalPlaying(true);
        setPlayingAyah(index + 1);
        scrollToAyah(index + 1);
      }
    } else if (currentPage < totalPages) {
      // If current page is complete, go to next page and start playing
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      setPageInput(newPage.toString());
      setIsAutoPlay(true);
      scrollToTop();
    } else if (playContinuous && currentSurah < allSurah.length) {
      // If continuous play is enabled and there are more surahs
      const nextSurah = currentSurah + 1;
      setCurrentSurah(nextSurah);
      setCurrentPage(1);
      setPageInput("1");
      setTotalAyat(0);
      setIsAutoPlay(true);
      scrollToTop();
    } else {
      // If we're on the last page of last surah or continuous play is disabled
      setPlayingAyah(null);
      setIsAutoPlay(false);
      setIsGlobalPlaying(false);
      lastPlayedAudioRef.current = { index: -1, audio: null };
    }
  };

  // Auto-play first audio when page loads and auto-play is enabled
  useEffect(() => {
    if (isAutoPlay && ayat.length > 0 && audioRefs.current[0]) {
      const timeout = setTimeout(() => {
        audioRefs.current[0]?.play();
        setPlayingAyah(0);
      }, 1000); // Wait for 1 second to let the page settle
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayat, isAutoPlay]);

  const totalPages = Math.ceil(totalAyat / itemsPerPage);

  return (
    <div className="relative min-h-screen">
      {/* Gilded Floating Global Play/Pause Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="fixed bottom-6 right-6 z-50 p-4 sm:p-[1.1rem] rounded-full
          bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600
          text-pine-950 border border-gold-200/70
          shadow-[0_14px_38px_-8px_rgba(201,162,39,0.65),inset_0_1px_0_rgba(255,255,255,0.6)]
          hover:shadow-[0_18px_44px_-8px_rgba(201,162,39,0.8),inset_0_1px_0_rgba(255,255,255,0.7)]
          transition-shadow duration-300"
        onClick={handleGlobalPlayPause}
        aria-label={isGlobalPlaying ? "Pause recitation" : "Play recitation"}
        whileHover={{ scale: 1.12, rotate: 3 }}
        whileTap={{ scale: 0.9 }}
      >
        {isGlobalPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 sm:h-7 sm:w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 sm:h-7 sm:w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </motion.button>

      <div className="flex flex-col lg:flex-row min-h-screen pattern-light">
        {/* Hamburger Menu Button - Only visible on mobile */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-pine-900 border border-gold-400/40
            text-gold-300 shadow-[0_8px_24px_-6px_rgba(6,35,26,0.6)]"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle navigation"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isSidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Sidebar - Always visible on desktop, toggleable on mobile */}
        <AnimatePresence>
          <motion.div
            initial={isDesktop ? false : { x: -320, opacity: 0 }}
            animate={
              isDesktop
                ? { x: 0, opacity: 1 }
                : isSidebarOpen
                ? { x: 0, opacity: 1 }
                : { x: -320, opacity: 0 }
            }
            exit={isDesktop ? undefined : { x: -320, opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className={`
              ${isDesktop ? "relative" : "fixed"}
              top-0 left-0 z-40
              h-screen w-80 flex-none
              pattern-dark
              border-r border-gold-400/25
              shadow-[12px_0_48px_-12px_rgba(6,35,26,0.55)]
              lg:block
              overflow-y-auto sidebar-scroll
            `}
          >
            <div className="p-6 flex-1">
              {/* Sidebar Brand */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-center pt-2 pb-5"
              >
                {/* Crest — gilded medallion holding the Holy Quran */}
                <div className="relative mx-auto mb-3 w-20 h-20 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full border border-gold-400/50"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 35%, rgba(212,175,55,0.35), rgba(212,175,55,0.05) 65%, transparent)",
                      boxShadow:
                        "0 0 34px rgba(212,175,55,0.28), inset 0 0 22px rgba(212,175,55,0.22)",
                    }}
                  />
                  <img
                    src={crestIcon}
                    alt="Al-Quran crest"
                    className="relative w-14 h-14 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
                  />
                </div>
                <h1 className="font-display text-[1.75rem] leading-tight text-gold-200 tracking-wide">
                  Al-Quran
                </h1>
                <p
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-base text-gold-400/90 mt-0.5 leading-snug"
                >
                  ٱلْقُرْآنُ ٱلْكَرِيمُ
                </p>
                <hr className="gold-divider-dark mt-4" />
              </motion.div>

              {/* Rest of sidebar content */}
              <div className="space-y-6">
                {/* Surah Search and Selection */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-4"
                >
                  <div className="space-y-2 relative">
                    <label
                      htmlFor="surah-search"
                      className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-300/80 pl-1"
                    >
                      Search &amp; Select Surah
                    </label>
                    <div className="relative" ref={searchInputRef}>
                      <div className="relative">
                        <input
                          id="surah-search"
                          type="text"
                          placeholder="Search by name or number…"
                          className="w-full rounded-xl pl-10 pr-4 py-2.5
                            bg-[#113f2d] border border-gold-400/[0.18]
                            text-gold-100 placeholder-white/30
                            focus:border-gold-400/60 focus:ring-2 focus:ring-gold-400/20 focus:outline-none
                            hover:border-gold-400/40 transition-all duration-200
                            shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onKeyDown={handleSearchKeyDown}
                        />
                        {/* Search Icon */}
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="h-5 w-5 text-gold-400/70"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Suggestions Dropdown */}
                      {showSuggestions && (
                        <div
                          className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden
                            bg-pine-900/95 backdrop-blur-md border border-gold-400/25
                            shadow-[0_20px_45px_-12px_rgba(0,0,0,0.6)]
                            max-h-64 overflow-y-auto sidebar-scroll"
                        >
                          {filteredSurahs.length > 0 ? (
                            filteredSurahs.map((surah, index) => {
                              const surahIndex = allSurah.findIndex(
                                (s) => s === surah
                              );
                              return (
                                <button
                                  key={surahIndex + 1}
                                  className={`w-full text-left px-4 py-2.5 my-0.5 flex items-center gap-3
                                    transition-colors focus:outline-none
                                    ${
                                      index === selectedSuggestionIndex
                                        ? "bg-gold-400/15 text-gold-200"
                                        : "text-pine-100 hover:bg-white/5 hover:text-gold-100"
                                    }`}
                                  onClick={() =>
                                    handleSuggestionClick(surahIndex + 1)
                                  }
                                  onMouseEnter={() =>
                                    setSelectedSuggestionIndex(index)
                                  }
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <span
                                    className="flex-none w-7 h-7 rounded-full border border-gold-400/40
                                      flex items-center justify-center text-[0.65rem] font-display text-gold-300"
                                  >
                                    {surahIndex + 1}
                                  </span>
                                  <span className="font-medium truncate">
                                    {surah.surahName}
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-4 text-white/40 text-center text-sm">
                              No surahs found
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Surah Select Dropdown */}
                    <select
                      aria-label="Select surah"
                      className="dark-select"
                      value={currentSurah.toString()}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newSurah = Number(e.target.value);
                        setCurrentSurah(newSurah);
                        setCurrentPage(1);
                        setPageInput("1");
                        setTotalAyat(0);
                        scrollToTop();
                        if (width < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                    >
                      {allSurah.map((surah, index) => (
                        <option key={index + 1} value={index + 1}>
                          {index + 1}. {surah.surahName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reciter Selection */}
                  <div className="space-y-2">
                    <label
                      htmlFor="reciter"
                      className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-300/80 pl-1"
                    >
                      Select Reciter
                    </label>
                    <select
                      name="reciter"
                      id="reciter"
                      value={reciter}
                      onChange={(e) => setReciter(e.target.value)}
                      className="dark-select"
                    >
                      {allReciters.map((reciter, index) => (
                        <option key={index} value={reciter}>
                          {reciter}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>

                {/* Page Navigation */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-4"
                >
                  <div
                    className="p-4 rounded-2xl border border-gold-400/20
                      bg-gradient-to-br from-white/[0.07] to-white/[0.03]
                      shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-300/80">
                        Current Page
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          aria-label="Page number"
                          className="w-14 rounded-lg border border-white/10 bg-black/25 text-gold-100 text-center text-sm
                            focus:border-gold-400/60 focus:ring-2 focus:ring-gold-400/20 focus:outline-none
                            transition-all duration-200 py-1.5
                            shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)]"
                          value={pageInput}
                          onChange={handlePageInputChange}
                          onBlur={handlePageInputBlur}
                          onKeyDown={handlePageInputKeyDown}
                        />
                        <span className="text-sm font-medium text-gold-200/80">
                          of {totalPages || 0}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-500
                          bg-gradient-to-r from-gold-600 via-gold-400 to-gold-200"
                        style={{
                          width: `${
                            totalPages > 0 ? (currentPage / totalPages) * 100 : 0
                          }%`,
                          boxShadow: "0 0 10px rgba(212,175,55,0.55)",
                        }}
                      />
                    </div>

                    {/* Play All Surahs Toggle */}
                    <div className="mt-4">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-xs font-medium text-pine-100 group-hover:text-gold-100 transition-colors">
                          Play All Surahs
                        </span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={playContinuous}
                            onChange={() => setPlayContinuous(!playContinuous)}
                            className="sr-only peer"
                          />
                          <div
                            className="w-10 h-6 rounded-full border border-white/15 bg-black/35 transition-colors
                            peer-checked:bg-gradient-to-r peer-checked:from-gold-500 peer-checked:to-gold-400
                            peer-checked:border-gold-300/60"
                          >
                            <span
                              className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-pine-100 shadow transition-transform duration-300
                                ${playContinuous ? "translate-x-4 bg-pine-950" : ""}`}
                            />
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="border border-white/15 hover:border-gold-400/50 hover:text-gold-200
                        text-pine-100 bg-white/[0.04] hover:bg-white/[0.08]
                        shadow-sm flex justify-center items-center gap-1 p-2.5 rounded-xl
                        disabled:opacity-35 disabled:hover:border-white/15 disabled:hover:text-pine-100
                        transition-all duration-200"
                      onClick={() => {
                        const newPage = Math.max(1, currentPage - 1);
                        setCurrentPage(newPage);
                        setPageInput(newPage.toString());
                        scrollToTop();
                        if (width < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      disabled={currentPage === 1}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Previous
                    </button>
                    <button
                      className="bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600
                        text-pine-950 font-semibold
                        hover:from-gold-200 hover:via-gold-400 hover:to-gold-500
                        border border-gold-200/60
                        shadow-[0_10px_24px_-8px_rgba(201,162,39,0.55),inset_0_1px_0_rgba(255,255,255,0.6)]
                        flex justify-center items-center gap-1 p-2.5 rounded-xl
                        disabled:opacity-40 disabled:saturate-[0.2] disabled:shadow-none disabled:border-white/10 transition-all duration-200"
                      onClick={() => {
                        const newPage = Math.min(totalPages, currentPage + 1);
                        setCurrentPage(newPage);
                        setPageInput(newPage.toString());
                        scrollToTop();
                        if (width < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Overlay for mobile - only shown when sidebar is open on mobile */}
        {isSidebarOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-pine-950 lg:hidden z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:pl-6">
          <div
            ref={mainContentRef}
            className="w-full mx-auto space-y-6 px-4 sm:px-6 lg:px-10 py-20 lg:py-8 h-screen overflow-y-auto"
          >
            {/* Surah Opener — gilded chapter frontispiece */}
            {surahMeta && (
              <motion.header
                key={`opener-${currentSurah}`}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="relative max-w-4xl mx-auto overflow-hidden rounded-2xl
                  pattern-dark border border-gold-400/40
                  shadow-[0_24px_50px_-22px_rgba(6,35,26,0.65)]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #d4af37 25%, #faf0cd 50%, #d4af37 75%, transparent)",
                  }}
                />
                <div className="px-6 py-6 sm:py-7 text-center">
                  <p className="text-[0.62rem] sm:text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-400/80 mb-2">
                    Surah {currentSurah} of {allSurah.length}
                  </p>
                  <h2
                    dir="rtl"
                    lang="ar"
                    className="font-arabic text-3xl sm:text-5xl text-gold-200 leading-snug
                      drop-shadow-[0_2px_10px_rgba(212,175,55,0.35)]"
                  >
                    {surahMeta.surahNameArabicLong}
                  </h2>
                  <p className="font-display text-lg sm:text-2xl text-gold-100 mt-2 tracking-wide">
                    {surahMeta.surahName}
                    <span className="text-gold-400/70"> · </span>
                    <span className="italic text-gold-200/85 text-base sm:text-xl">
                      {surahMeta.surahNameTranslation}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/35 bg-black/25 px-3 py-1 text-[0.68rem] sm:text-xs text-gold-200/90">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21l7-4V5l-7-3-7 3v12l7 4z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v8"
                        />
                      </svg>
                      {surahMeta.revelationPlace}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/35 bg-black/25 px-3 py-1 text-[0.68rem] sm:text-xs text-gold-200/90">
                      <span
                        aria-hidden
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gold-400 text-[0.55rem] text-pine-950"
                      >
                        ✦
                      </span>
                      {surahMeta.totalAyah} Ayahs
                    </span>
                  </div>
                </div>
              </motion.header>
            )}

            {/* Bismillah — traditional chapter invocation (not for surah 1 or 9) */}
            {currentSurah !== 1 && currentSurah !== 9 && (
              <div className="max-w-4xl mx-auto flex items-center gap-4 px-2">
                <hr className="gold-divider flex-1" />
                <p
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-2xl sm:text-4xl text-pine-800 whitespace-nowrap py-1"
                >
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </p>
                <hr className="gold-divider flex-1" />
              </div>
            )}

            {ayat.map((ayah, index) => (
              <div key={`${ayah.surahNo}_${ayah.ayahNo}`}>
                <motion.div
                  ref={(el) => {
                    ayahRefs.current[index] = el;
                  }}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                  className={`bg-ivory rounded-2xl mx-auto max-w-4xl p-5 sm:p-6 relative
                    border transition-all duration-500
                    ${
                      playingAyah === index
                        ? "card-playing"
                        : "border-sand shadow-[0_14px_38px_-22px_rgba(6,35,26,0.45)]"
                    }`}
                >
                  {/* Corner ornaments */}
                  <span aria-hidden className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-gold-400/60 rounded-tl-md pointer-events-none" />
                  <span aria-hidden className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-gold-400/60 rounded-tr-md pointer-events-none" />
                  <span aria-hidden className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-gold-400/60 rounded-bl-md pointer-events-none" />
                  <span aria-hidden className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-gold-400/60 rounded-br-md pointer-events-none" />

                  {/* Arabic Text Section */}
                  <motion.div
                    className="border-b border-sand/80 pb-5 pt-2 px-2 sm:px-4 rounded-2xl w-full relative overflow-hidden"
                    animate={{
                      scale: playingAyah === index ? 1.03 : 1,
                      opacity:
                        playingAyah === null || playingAyah === index ? 1 : 0.55,
                    }}
                    transition={{
                      duration: 0.5,
                      ease: "easeInOut",
                    }}
                  >
                    {/* Gilded Shine Effect while playing */}
                    {playingAyah === index && (
                      <motion.div
                        className="absolute inset-0 w-[50%] bg-gradient-to-r from-transparent via-gold-300 to-transparent opacity-40 z-10 pointer-events-none"
                        initial={{ x: "220%" }}
                        animate={{ x: "-220%" }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                    <motion.p
                      dir="rtl"
                      lang="ar"
                      className="font-arabic text-right text-2xl sm:text-[2rem] leading-loose relative text-pine-800"
                      animate={{
                        color: playingAyah === index ? "#a8842a" : "#113f2d",
                        textShadow:
                          playingAyah === index
                            ? "0 0 16px rgba(212,175,55,0.45)"
                            : "0 0 0px rgba(0,0,0,0)",
                      }}
                      transition={{
                        duration: 0.5,
                        ease: "easeInOut",
                      }}
                    >
                      {ayah.arabic1}
                    </motion.p>
                  </motion.div>

                  {/* Translations Section */}
                  <div className="mt-4 space-y-4 px-1 sm:px-3">
                    {/* English Translation */}
                    <div className="text-left">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold-600/90 mb-1">
                        Translation · EN
                      </p>
                      <p className="text-base sm:text-lg text-ink leading-relaxed">
                        {ayah.english}
                      </p>
                    </div>

                    {/* Bengali Translation */}
                    <div className="text-left">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold-600/90 mb-1">
                        অনুবাদ · BN
                      </p>
                      <p className="bengali-text text-sm sm:text-base text-[#4a554c] leading-relaxed">
                        {ayah.bengali}
                      </p>
                    </div>

                    {/* Audio Section */}
                    <div className="mt-2 rounded-xl border border-sand bg-parchment/60 px-2 py-1.5 shadow-[inset_0_1px_3px_rgba(6,35,26,0.08)]">
                      <audio
                        controls
                        className="w-full h-10"
                        ref={(el) => {
                          audioRefs.current[index] = el;
                        }}
                        onPlay={() => handleAudioPlay(index)}
                        onPause={() => handleAudioPause()}
                        onEnded={() => handleAudioEnd(index)}
                        src={getAudioUrl(ayah, reciter)}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap justify-between items-center text-xs pt-3 border-t border-sand gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pine-50 border border-pine-600/20 rounded-full font-medium text-pine-800">
                          <span
                            aria-hidden
                            className="w-1.5 h-1.5 rounded-full bg-gold-500"
                          />
                          {ayah.surahName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6b7263]">
                        <span className="font-medium hidden sm:inline">
                          Ayah {ayah.ayahNo} of {totalAyat}
                        </span>
                        <span className="ayah-medallion">{ayah.ayahNo}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}

            {/* Closing ornament */}
            {ayat.length > 0 && (
              <footer className="max-w-4xl mx-auto pb-10 pt-2 text-center">
                <hr className="gold-divider mb-4" />
                <p className="font-display text-[0.72rem] sm:text-xs uppercase tracking-[0.35em] text-pine-700/80">
                  ✦ &nbsp;Read · Listen · Reflect&nbsp; ✦
                </p>
              </footer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
