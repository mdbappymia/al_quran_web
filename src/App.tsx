import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import allSurah from "./assets/all_surah.json";
import allReciters from "./assets/reciter_list.json";

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
            `/src/assets/ayath/${currentSurah}/${i}.json`
          ).then((res) => (res.ok ? res.json() : null));
          promises.push(response);
        }
        const results = await Promise.all(promises);
        setAyat(results.filter((result) => result !== null));
        if (totalAyat === 0) {
          const firstAyah = await fetch(
            `/src/assets/ayath/${currentSurah}/1.json`
          ).then((res) => res.json());
          setTotalAyat(firstAyah.totalAyah);
        }
      } catch (error) {
        console.error("Error loading ayat:", error);
      }
    };

    loadAyat();
  }, [currentSurah, currentPage, totalAyat, itemsPerPage, reciter]);
  console.log(reciter);
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
  }, [ayat, isAutoPlay]);

  const totalPages = Math.ceil(totalAyat / itemsPerPage);

  return (
    <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Add Global Play/Pause Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-green-500 shadow-lg hover:bg-green-600 
          transition-all duration-200 text-white"
        onClick={handleGlobalPlayPause}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isGlobalPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </motion.button>

      <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8F9FA]">
        {/* Hamburger Menu Button - Only visible on mobile */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-emerald-500 shadow-lg"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
            initial={isDesktop ? false : { x: -300, opacity: 0 }}
            animate={
              isDesktop
                ? { x: 0, opacity: 1 }
                : isSidebarOpen
                ? { x: 0, opacity: 1 }
                : { x: -300, opacity: 0 }
            }
            exit={isDesktop ? undefined : { x: -300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`
              ${isDesktop ? "relative" : "fixed"} 
              top-0 left-0 z-40
              h-screen w-80
              bg-white shadow-lg
              lg:block
              overflow-y-auto
            `}
          >
            <div className="p-6 flex-1">
              {/* Sidebar Content */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L1 12H4V21H20V12H23L12 2Z"
                      className="fill-emerald-600"
                    />
                  </svg>
                </div>
                <h3 className="text-5xl font-bold text-gray-800">Al-Quran</h3>
              </motion.div>

              {/* Rest of sidebar content */}
              <div className="space-y-6">
                {/* Surah Search and Selection */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-gray-700">
                    Search & Select Surah
                  </label>
                  <div className="space-y-2 relative">
                    <div className="relative" ref={searchInputRef}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search by name or number..."
                          className="w-full rounded-lg pl-10 pr-4 py-2.5 border border-gray-200 bg-white text-gray-700 placeholder-gray-400
                            focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 focus:ring-opacity-20
                            hover:border-gray-300 transition-all duration-200 shadow-sm"
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
                            className="h-5 w-5 text-gray-400"
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

                      {/* Suggestions Dropdown with enhanced styling */}

                      {/* Suggestions Dropdown */}
                      {showSuggestions && (
                        <div
                          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-y-auto
                          divide-y divide-gray-50"
                        >
                          {filteredSurahs.length > 0 ? (
                            filteredSurahs.map((surah, index) => {
                              const surahIndex = allSurah.findIndex(
                                (s) => s === surah
                              );
                              return (
                                <button
                                  key={surahIndex + 1}
                                  className={`w-full text-left px-4 py-3 my-1 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none transition-colors
                                    ${
                                      index === selectedSuggestionIndex
                                        ? "bg-emerald-50"
                                        : ""
                                    }
                                    ${
                                      index === selectedSuggestionIndex
                                        ? "text-emerald-700"
                                        : "text-gray-700"
                                    }`}
                                  onClick={() =>
                                    handleSuggestionClick(surahIndex + 1)
                                  }
                                  onMouseEnter={() =>
                                    setSelectedSuggestionIndex(index)
                                  }
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      {surahIndex + 1}. {surah.surahName}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              No surahs found
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Select Dropdown */}
                    <select
                      className="w-full rounded-lg py-2.5 pl-4 pr-10 border border-gray-200 bg-white text-gray-700
                        focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 focus:ring-opacity-20
                        hover:border-gray-300 transition-all duration-200 shadow-sm cursor-pointer"
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
                  {/* reciter options  */}
                  <div className="mt-4">
                    <label
                      htmlFor="reciter"
                      className="text-sm font-medium text-gray-700"
                    >
                      Select Reciter
                    </label>
                    <select
                      name="reciter"
                      id="reciter"
                      value={reciter}
                      onChange={(e) => setReciter(e.target.value)}
                      className="w-full rounded-lg border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                    >
                      {allReciters.map((reciter, index) => (
                        <option key={index} value={reciter}>
                          {reciter}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>

                {/* Page Navigation with enhanced inputs */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-emerald-50 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-emerald-700">
                        Current Page
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="w-16 rounded-md border-gray-200 bg-white text-gray-700 text-center text-sm
                            focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 focus:ring-opacity-20
                            hover:border-gray-300 transition-all duration-200 shadow-sm py-1.5"
                          value={pageInput}
                          onChange={handlePageInputChange}
                          onBlur={handlePageInputBlur}
                          onKeyDown={handlePageInputKeyDown}
                        />
                        <span className="text-sm font-medium text-emerald-900">
                          of {totalPages}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${(currentPage / totalPages) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Auto-play and Continuous Play Controls */}
                    <div className="mt-3 space-y-3">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm font-medium text-emerald-700 group-hover:text-emerald-800">
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
                            className="w-5 h-5 border-2 border-gray-300 rounded transition-colors
                            peer-checked:border-emerald-500 peer-checked:bg-emerald-500
                            peer-hover:border-emerald-400 peer-checked:peer-hover:bg-emerald-600"
                          >
                            {/* Checkmark */}
                            <svg
                              className={`w-full h-full text-white stroke-2 ${
                                playContinuous ? "block" : "hidden"
                              }`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex justify-center items-center p-2 rounded-lg"
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
                        className="w-5 h-5 mr-1"
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
                      className="bg-emerald-500 hover:bg-emerald-600 shadow-sm flex justify-center items-center p-2 rounded-lg"
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
                        className="w-5 h-5 ml-1"
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
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black lg:hidden z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-5">
          <div
            ref={mainContentRef}
            className="w-full mx-auto space-y-6 py-20 lg:py-5 h-screen overflow-y-auto"
          >
            {ayat.map((ayah, index) => (
              <div key={`${ayah.surahNo}_${ayah.ayahNo}`}>
                <motion.div
                  ref={(el) => {
                    ayahRefs.current[index] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg mx-auto max-w-4xl p-5 hover:shadow-xl transition-shadow duration-300 border-4 border-gray-200"
                >
                  <div className="p-4">
                    {/* Arabic Text Section */}
                    <motion.div
                      className="border-b border-gray-100 p-4 rounded-2xl w-full relative overflow-hidden"
                      animate={{
                        scale: playingAyah === index ? 1.05 : 1,
                        opacity:
                          playingAyah === null || playingAyah === index
                            ? 1
                            : 0.5,
                      }}
                      transition={{
                        duration: 0.5,
                        ease: "easeInOut",
                      }}
                    >
                      {/* Shine Effect */}
                      {playingAyah === index && (
                        <motion.div
                          className="absolute inset-0 w-[50%] bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-30 z-10 pointer-events-none"
                          initial={{ x: "200%" }}
                          animate={{ x: "-200%" }}
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
                        className="font-arabic text-right text-2xl sm:text-3xl leading-relaxed relative"
                        animate={{
                          color: playingAyah === index ? "#059669" : "#1F2937",
                          textShadow:
                            playingAyah === index
                              ? "0 0 10px rgba(5, 150, 105, 0.3)"
                              : "none",
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
                    <div className="mt-4 space-y-4">
                      {/* English Translation */}
                      <div className="text-left">
                        <p className="text-base sm:text-lg text-gray-900 leading-relaxed">
                          {ayah.english}
                        </p>
                      </div>

                      {/* Bengali Translation */}
                      <div className="text-left">
                        <p className="text-sm sm:text-md text-gray-700 leading-relaxed">
                          {ayah.bengali}
                        </p>
                      </div>

                      {/* Audio Section */}
                      <div className="mt-4">
                        <audio
                          controls
                          className="w-full"
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
                      <div className="flex flex-wrap justify-between items-center text-xs pt-3 border-t border-gray-200 gap-2">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
