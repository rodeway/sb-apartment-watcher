import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, MapPin, Ruler, Car, Ban, Plus, Trash2, Edit2, Info, Bike, WashingMachine, Mic, Loader2, ExternalLink, Utensils, Archive, ArchiveRestore, Sparkles, UploadCloud, SlidersHorizontal, SearchCode } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import WeightCalculator from './WeightCalculator';

// This is your original list of apartments, now serving as the manual/static data source.
const MANUAL_DATA = [
  { id: 42, address: '42 Broadmoor Plaza #5', manager: 'Sierra', listingUrl: 'https://sierrapropsb.com/residential/', zillowUrl: '', rent: 2850, neighborhood: 15, bathroom: 25, sqft: 25, parking: 20, hospital: 15, flooring: 10, storage: 10, amtrak: 10, laundry: 0, dishwasher: 0, driveHospital: '6 min', bikeEastBeach: '22 min', bikeArroyoBurro: '16 min', bikeAmtrak: '15 min', notes: 'FRIDAY TOUR (Jovien): CURRENT #1 TARGET. Upstairs corner unit, exceptionally large bedroom, private balcony. Verify dishwasher.' },
  { id: 32, address: '1720 De La Vina St #4', manager: 'Bartlein', listingUrl: 'https://bartlein.com/rentals.html', zillowUrl: '', rent: 2600, neighborhood: 20, bathroom: -1, sqft: 0, parking: 20, hospital: 15, flooring: 10, storage: 0, amtrak: 10, laundry: 0, dishwasher: 0, driveHospital: '4 min', bikeEastBeach: '14 min', bikeArroyoBurro: '19 min', bikeAmtrak: '9 min', notes: 'Oak Park sweet spot. Carport + hardwood floors. Add to Saturday Bartlein key loop. Verify sq ft and bathroom layout.' },
  { id: 3578, address: '3578 Modoc Road #8', manager: 'Bartlein', listingUrl: 'https://bartlein.com/rentals.html', zillowUrl: '', rent: 2775, neighborhood: 10, bathroom: 25, sqft: 25, parking: 20, hospital: 10, flooring: 5, storage: 10, amtrak: 10, laundry: 10, dishwasher: 5, driveHospital: '7 min', bikeEastBeach: '25 min', bikeArroyoBurro: '12 min', bikeAmtrak: '19 min', notes: 'SATURDAY KEY: The Space King. 800 sq ft verified, private garage, in-unit W/D. Assess carpet allergy situation.' },
  { id: 2728, address: '2728 De La Vina St #2', manager: 'Sierra', listingUrl: 'https://sierrapropsb.com/residential/', zillowUrl: '', rent: 2600, neighborhood: 15, bathroom: -1, sqft: 0, parking: 20, hospital: 15, flooring: 10, storage: 0, amtrak: 10, laundry: 0, dishwasher: 0, driveHospital: '4 min', bikeEastBeach: '18 min', bikeArroyoBurro: '15 min', bikeAmtrak: '10 min', notes: 'MORNING SCAN: San Roque/Oak Park border. Hardwood floors and assigned parking confirmed. Email Jovien to add to Friday tour!' },
  { id: 31, address: '455 W. Gutierrez St', manager: 'Zillow', listingUrl: '', zillowUrl: '', rent: 2895, neighborhood: 25, bathroom: -1, sqft: 0, parking: 20, hospital: 10, flooring: 10, storage: 0, amtrak: 10, laundry: 10, dishwasher: 5, driveHospital: '6 min', bikeEastBeach: '10 min', bikeArroyoBurro: '18 min', bikeAmtrak: '4 min', notes: 'ZILLOW WILDCARD: Heavily remodeled! Hardwood, parking, and in-unit W/D. Elite train commute. Needs sqft & bathroom layout check.' },
  { id: 11, address: '2508 Castillo St #3', manager: 'Bartlein', listingUrl: 'https://bartlein.com/rentals.html', zillowUrl: '', rent: 1650, neighborhood: 20, bathroom: -1, sqft: 15, parking: 20, hospital: 15, flooring: 10, storage: 0, amtrak: 10, laundry: 0, dishwasher: 0, driveHospital: '3 min', bikeEastBeach: '15 min', bikeArroyoBurro: '18 min', bikeAmtrak: '8 min', notes: 'VALUE KING: Oak Park. Carport, hardwood floors, sub-5 min ride to hospital. High priority for Saturday key pickup.' },
  { id: 30, address: '23 W. Mission St #B', manager: 'Bartlein', listingUrl: 'https://bartlein.com/rentals.html', zillowUrl: '', rent: 2900, neighborhood: 20, bathroom: -1, sqft: 0, parking: 20, hospital: 15, flooring: 10, storage: 0, amtrak: 10, laundry: 10, dishwasher: 0, driveHospital: '2 min', bikeEastBeach: '16 min', bikeArroyoBurro: '17 min', bikeAmtrak: '10 min', notes: 'SATURDAY KEY: Off-street parking CONFIRMED! W/D hookups (treating as in-unit capability). Has balcony & hardwood. Verify sq ft with DTAPE.' },
  { id: 432, address: '432 W Valerio St', manager: 'Zillow', listingUrl: '', zillowUrl: '', rent: 2775, neighborhood: 25, bathroom: 0, sqft: 15, parking: 20, hospital: 15, flooring: 10, storage: 0, amtrak: 10, laundry: 0, dishwasher: 0, driveHospital: '4 min', bikeEastBeach: '12 min', bikeArroyoBurro: '18 min', bikeAmtrak: '8 min', notes: 'ZILLOW INTEL: 625 sq ft confirmed. Pergo floors, off-street parking. PENALTY: Bathroom is inside the bedroom (0 hosting points).' },
  { id: 2102, address: '2102 Bath St #12', manager: 'Meridian', listingUrl: 'https://www.meridiangrouprem.com/vacancies', zillowUrl: '', rent: 2550, neighborhood: 25, bathroom: -1, sqft: 0, parking: 20, hospital: 15, flooring: 5, storage: 0, amtrak: 10, laundry: 0, dishwasher: 0, driveHospital: '4 min', bikeEastBeach: '12 min', bikeArroyoBurro: '19 min', bikeAmtrak: '6 min', notes: 'FRIDAY TOUR: 4:00 PM appointment. Downtown, has carpet penalty. Verify layout and DTAPE the sq ft.' }
];

const INITIAL_SCORING = {
  neighborhood: [
    { label: 'Downtown (25)', value: 25 }, { label: 'Oak Park (20)', value: 20 },
    { label: 'San Roque (15)', value: 15 }, { label: 'Other (10)', value: 10 },
    { label: 'TBD', value: -1 }
  ],
  bathroom: [
    { label: 'Hallway / Separate (25)', value: 25 }, { label: 'In Bedroom (0)', value: 0 }, { label: 'TBD', value: -1 }
  ],
  sqft: [
    { label: '700+ sq ft (25)', value: 25 }, { label: '650-699 sq ft (20)', value: 20 },
    { label: '600-649 sq ft (15)', value: 15 }, { label: '550-599 sq ft (10)', value: 10 },
    { label: '< 550 sq ft (0)', value: 0 }, { label: 'TBD', value: -1 }
  ],
  parking: [
    { label: 'Assigned / Garage (20)', value: 20 }, { label: 'Street Only (0)', value: 0 },
    { label: 'TBD', value: -1 }
  ],
  hospital: [
    { label: '< 5 min e-bike (15)', value: 15 }, { label: '5-10 min e-bike (10)', value: 10 }, { label: '> 10 min (0)', value: 0 },
    { label: 'TBD', value: -1 }
  ],
  flooring: [
    { label: 'Hardwood/Laminate/Tile (10)', value: 10 }, { label: 'Carpet (5)', value: 5 },
    { label: 'TBD', value: -1 }
  ],
  storage: [
    { label: 'Dedicated Storage / Garage (10)', value: 10 }, { label: 'None (0)', value: 0 },
    { label: 'TBD', value: -1 }
  ],
  amtrak: [
    { label: '< 4 miles flat (10)', value: 10 }, { label: '> 4 miles (0)', value: 0 },
    { label: 'TBD', value: -1 }
  ],
  laundry: [
    { label: 'In-Unit (10)', value: 10 }, { label: 'On-Site Shared (0)', value: 0 }, { label: 'None (Dealbreaker)', value: -100 }, { label: 'TBD', value: -1 }
  ],
  dishwasher: [
    { label: 'Yes (5)', value: 5 }, { label: 'No (0)', value: 0 }, { label: 'TBD', value: -1 }
  ]
};

const INITIAL_WEIGHTS = {
  bathroom: 50, sqft: 50, neighborhood: 50, parking: 50, hospital: 50,
  flooring: 30, storage: 30, amtrak: 30, laundry: 30, dishwasher: 30
};

const MAX_SCORE = 400;

const FeatureTag = ({ icon, text, color = 'slate' }) => {
    const colorClasses = {
        green: 'bg-green-100 text-green-800',
        indigo: 'bg-indigo-100 text-indigo-800',
        amber: 'bg-amber-100 text-amber-800',
        rose: 'bg-rose-100 text-rose-800',
        slate: 'bg-slate-200 text-slate-700',
    };

    return (
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colorClasses[color]}`}>
            {icon}
            <span>{text}</span>
        </div>
    );
};

export default function App() {
  const [apartments, setApartments] = useState(() => {
    try {
      const savedApts = localStorage.getItem('apartments');
      // If we have saved data, use it. Otherwise, start with the hardcoded manual data.
      return savedApts ? JSON.parse(savedApts) : MANUAL_DATA;
    } catch (error) {
      console.error("Failed to parse apartments from localStorage", error);
      return MANUAL_DATA;
    }
  });
  const [weights, setWeights] = useState(() => {
    try {
      const savedWeights = localStorage.getItem('scoringWeights400');
      return savedWeights ? JSON.parse(savedWeights) : INITIAL_WEIGHTS;
    } catch (error) {
      console.error("Failed to parse scoring weights from localStorage", error);
      return INITIAL_WEIGHTS;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [addToDaily, setAddToDaily] = useState(true);
  const [scrapeTriggerTime, setScrapeTriggerTime] = useState(null);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isTriggeringScrape, setIsTriggeringScrape] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [isScrapeDialogOpen, setIsScrapeDialogOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [archivedApartments, setArchivedApartments] = useState(() => {
    try {
      const savedArchived = localStorage.getItem('archivedApartments');
      return savedArchived ? JSON.parse(savedArchived) : [];
    } catch (error) {
      console.error("Failed to parse archived apartments from localStorage", error);
      return [];
    }
  });
  const [savedProfiles, setSavedProfiles] = useState(() => {
    try {
      const profiles = localStorage.getItem('savedWeightProfiles');
      return profiles ? JSON.parse(profiles) : [];
    } catch (error) {
      console.error("Failed to parse saved profiles from localStorage", error);
      return [];
    }
  });
  const [isGuillotineMenuOpen, setIsGuillotineMenuOpen] = useState(false);
  const [guillotineCriteria, setGuillotineCriteria] = useState(() => {
      try {
        const savedCriteria = localStorage.getItem('guillotineCriteria');
        return savedCriteria ? JSON.parse(savedCriteria) : { maxPrice: 3000, streetParking: true };
      } catch (error) {
        return { maxPrice: 3000, streetParking: true };
      }
  });
  const [showWeightConfirmation, setShowWeightConfirmation] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [selectedManager, setSelectedManager] = useState('All');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingAptId, setRecordingAptId] = useState(null);
  const [processingAptId, setProcessingAptId] = useState(null);
  const [pendingCategories, setPendingCategories] = useState([]);
  const [activeAptIdForCategory, setActiveAptIdForCategory] = useState(null);
  const [newCategoryWeight, setNewCategoryWeight] = useState(5);

  // Effect to save active apartments to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('apartments', JSON.stringify(apartments));
    } catch (error) {
      console.error("Failed to save apartments to localStorage", error);
    }
  }, [apartments]);

  // Effect to save archived apartments to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('archivedApartments', JSON.stringify(archivedApartments));
    } catch (error) {
      console.error("Failed to save archived apartments to localStorage", error);
    }
  }, [archivedApartments]);

  // Effect to save weights to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('scoringWeights400', JSON.stringify(weights));
    } catch (error) {
      console.error("Failed to save scoring weights to localStorage", error);
    }
  }, [weights]);

  // Effect to save profiles to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('savedWeightProfiles', JSON.stringify(savedProfiles));
    } catch (error) {
      console.error("Failed to save weight profiles to localStorage", error);
    }
  }, [savedProfiles]);

  // Effect to save guillotine criteria to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('guillotineCriteria', JSON.stringify(guillotineCriteria));
    } catch (error) {
      console.error("Failed to save guillotine criteria to localStorage", error);
    }
  }, [guillotineCriteria]);

  // Effect to auto-hide the weight confirmation dialog
  useEffect(() => {
    if (showWeightConfirmation) {
      const timer = setTimeout(() => {
        setShowWeightConfirmation(false);
      }, 2000); // Disappears after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [showWeightConfirmation]);

  // This master effect runs on mount to sync data from the backend and merge any new scrapes.
  useEffect(() => {
    const syncAndFetch = async () => {
      setIsLoading(true);
      let serverState;

      // 1. Try to fetch the master state from the backend (Vercel KV).
      try {
        const response = await fetch('/api/get-app-state');
        if (response.ok) {
          serverState = await response.json();
          console.log("Successfully fetched master state from backend.");
        } else {
          console.warn("Could not fetch master state, will rely on local data.");
        }
      } catch (error) {
        console.error("Error fetching master state:", error);
      }

      // 2. Use server state as the source of truth if available; otherwise, we're already using localStorage data from the useState initializer.
      let currentApts = serverState?.apartments || apartments;
      let currentArchived = serverState?.archivedApartments || archivedApartments;

      // 3. Fetch newly scraped apartments from apartments.json (if any) and merge them in.
      try {
        const response = await fetch(`/apartments.json?t=${Date.now()}`); // cache-bust
        if (response.ok) {
          const newApts = await response.json();
          if (newApts && newApts.length > 0) {
              const allKnownIds = new Set([...currentApts.map(a => a.id), ...currentArchived.map(a => a.id)]);
              const filteredNewApts = newApts.filter(a => !allKnownIds.has(a.id));
              if (filteredNewApts.length > 0) {
                  console.log(`Merging ${filteredNewApts.length} newly scraped apartments.`);
                  currentApts = [...currentApts, ...filteredNewApts];
              }
          }
        }
      } catch (error) {
        console.error("Could not fetch new apartments.json:", error);
      }

      // 4. Set the final state.
      setApartments(currentApts);
      setArchivedApartments(currentArchived);
      setIsLoading(false);
    };

    syncAndFetch();
  }, []); // Run only on mount.

  // This effect syncs the state back to the backend whenever apartments change.
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load.

    const handler = setTimeout(async () => {
      console.log("Attempting to sync state to backend...");
      await fetch('/api/set-app-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apartments, archivedApartments }) });
    }, 1500); // Debounce for 1.5 seconds to avoid too many writes.

    return () => clearTimeout(handler);
  }, [apartments, archivedApartments, isLoading]);

  // Effect for polling scrape results
  useEffect(() => {
    if (!scrapeTriggerTime) return;

    const pollInterval = 7000; // 7 seconds
    const maxDuration = 5 * 60 * 1000; // 5 minutes

    const intervalId = setInterval(async () => {
      try {
        // Add a cache-busting query param to ensure we get the latest file
        const response = await fetch(`/scrape_result.json?t=${Date.now()}`);
        if (response.ok) {
          const result = await response.json();
          const resultTime = new Date(result.timestamp).getTime();
          
          if (resultTime > scrapeTriggerTime) {
            clearInterval(intervalId);
            setScrapeTriggerTime(null); // Stop polling
            
            if (result.added_units && result.added_units.length > 0) {
              const addresses = result.added_units.map(u => u.address).join('; ');
              setScrapeStatus(`✅ Scrape complete! Added ${result.added_units.length} unit(s): ${addresses}. Refreshing data...`);
              setTimeout(() => window.location.reload(), 4000); // Reload to show new data
            } else {
              setScrapeStatus('✅ Scrape complete! No new units were found.');
            }
          }
        }
      } catch (error) {
        console.error("Polling for scrape result failed:", error);
      }
    }, pollInterval);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (scrapeTriggerTime) setScrapeStatus(prev => prev.includes('Success') ? 'Polling timed out. The scrape may be taking longer than usual. Check GitHub Actions for status.' : prev);
    }, maxDuration);

    return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
  }, [scrapeTriggerTime]);

  const defaultForm = {
    address: '', manager: '', listingUrl: '', zillowUrl: '', rent: '', notes: '',
    driveHospital: '', bikeEastBeach: '', bikeArroyoBurro: '', bikeAmtrak: '',
    guillotine: 0, neighborhood: -1, bathroom: -1, sqft: -1, parking: -1, hospital: -1,
    flooring: -1, storage: -1, amtrak: -1, laundry: -1, dishwasher: -1
  };
  const [formData, setFormData] = useState(defaultForm);
  
  const calculateScore = useCallback((apt) => {
    let score = 0;
    let dealbreakers = [];

    const getMaxScore = (category) => {
        if (!INITIAL_SCORING[category]) return 0;
        const values = INITIAL_SCORING[category].map(o => o.value).filter(v => v > 0);
        return Math.max(...values, 0);
    };

    for (const key in weights) {
        if (Object.hasOwnProperty.call(weights, key)) {
            const weight = weights[key];
            const aptScore = apt[key];
            const maxScore = getMaxScore(key);

            if (aptScore !== undefined && aptScore >= 0 && maxScore > 0) {
                const normalizedScore = aptScore / maxScore;
                score += normalizedScore * weight;
            }
        }
    }

    if (apt.guillotine) {
        score += apt.guillotine;
    }
    
    score = Math.round(score);

    if (apt.sqft === 0 && apt.storage === 0) dealbreakers.push("Micro-Unit (<550 sqft) without dedicated storage");
    if (apt.laundry === -100) dealbreakers.push("No on-site laundry");

    // Dynamic Guillotines from user menu
    if (apt.rent > guillotineCriteria.maxPrice) {
      dealbreakers.push(`Rent > $${guillotineCriteria.maxPrice}`);
    }
    if (guillotineCriteria.streetParking && apt.parking === 0) {
      dealbreakers.push("Street parking only");
    }

    // AI-based guillotine (for bedroom count)
    if (apt.guillotine === -1000) {
      dealbreakers.unshift("Guillotine: Fails bedroom criteria");
    }

    return { score, dealbreakers };
  }, [weights, guillotineCriteria]);

  const uniqueManagers = useMemo(() => {
    const allApts = [...apartments, ...archivedApartments];
    const managers = new Set(allApts.map(apt => apt.manager).filter(Boolean));
    return ['All', ...Array.from(managers).sort()];
  }, [apartments, archivedApartments]);

  const sortedApartments = useMemo(() => {
    const filtered = apartments.filter(apt => 
        selectedManager === 'All' || apt.manager === selectedManager
    );
    return filtered.map(apt => ({ ...apt, calculated: calculateScore(apt) })).sort((a, b) => b.calculated.score - a.calculated.score);
  }, [apartments, calculateScore, selectedManager]);

  const sortedArchivedApartments = useMemo(() => {
    const filtered = archivedApartments.filter(apt => 
        selectedManager === 'All' || apt.manager === selectedManager
    );
    return filtered.map(apt => ({ ...apt, calculated: calculateScore(apt) })).sort((a, b) => b.calculated.score - a.calculated.score);
  }, [archivedApartments, calculateScore, selectedManager]);

  const handleSave = () => {
    const newApt = {
      ...formData,
      id: editingApt ? editingApt.id : Date.now(),
      rent: parseInt(formData.rent, 10) || 0, // Ensure rent is a number
    };

    if (editingApt) {
      setApartments(apartments.map(a => a.id === editingApt.id ? newApt : a));
    } else {
      setApartments([...apartments, newApt]);
    }
    setScreenshotFile(null);
    closeForm();
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingApt(null);
    setFormData(defaultForm);
    setScreenshotFile(null);
  };

  const openEdit = (apt) => {
    setFormData(apt);
    setEditingApt(apt);
    setIsFormOpen(true);
  };

  const archiveApt = (id) => {
    const aptToArchive = apartments.find(a => a.id === id);
    if (aptToArchive) {
      setApartments(apartments.filter(a => a.id !== id));
      setArchivedApartments(prev => [...prev, aptToArchive]);
    }
  };

  const restoreApt = (id) => {
    const aptToRestore = archivedApartments.find(a => a.id === id);
    if (aptToRestore) {
      setArchivedApartments(archivedApartments.filter(a => a.id !== id));
      setApartments(prev => [...prev, aptToRestore]);
    }
  };

  const permanentlyDeleteApt = (id) => {
    setArchivedApartments(archivedApartments.filter(a => a.id !== id));
  };

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to clear all local changes and reset to the default data? This will reload the page.")) {
      localStorage.removeItem('apartments');
      localStorage.removeItem('archivedApartments');
      localStorage.removeItem('geminiApiKey');
      localStorage.removeItem('scoringWeights400');
      localStorage.removeItem('guillotineCriteria');
      localStorage.removeItem('savedWeightProfiles');
      localStorage.removeItem('scoringWeights');
      window.location.reload();
    }
  };

  // Helper to convert file to base64 for Gemini API
  const fileToGenerativePart = async (file) => {
    const base64EncodedData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: base64EncodedData, mimeType: file.type },
    };
  };

  const handleParseScreenshot = async () => {
    if (!screenshotFile) {
      setParseError('Please select a screenshot file first.');
      return;
    }
    if (!geminiApiKey) {
      setParseError('Please enter your Gemini API key to parse screenshots.');
      return;
    }

    setIsParsing(true);
    setParseError('');

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const imagePart = await fileToGenerativePart(screenshotFile);

      const prompt = `
      You are an expert apartment hunting data-entry assistant. Analyze the attached screenshot of a rental listing and extract the information into a JSON object.

      **SCORING AND CRITERIA:**
      -   **Guillotine Rule:** If the unit is NOT a 1-bedroom or 2-bedroom, OR if the rent is over $3,000, you MUST assign a 'guillotine' score of -1000. Otherwise, 'guillotine' is 0. This is the most important rule.
      -   You MUST process the listing and return a full JSON object even if it fails the guillotine rule. Do NOT return a rejection_reason.
      -   Your response MUST be a single, clean JSON object.

      **SCORING RULES:**
      - neighborhood: Downtown (25), Oak Park (20), San Roque (15), Other (10).
      - bathroom: Hallway access (25), In-bedroom (0), Unknown (-1).
      - sqft: 700+ (25), 650-699 (20), 600-649 (15), 550-599 (10), <550 (0), Unknown (0).
      - parking: Assigned/Garage (20), Street Only (0).
      - flooring: Hardwood/Laminate/Tile (10), Carpet (5), Unknown (5).
      - storage: Has dedicated storage (10), None (0), Unknown (0).
      - laundry: In-Unit (10), On-Site (0), None (-100), Unknown (-1).
      - dishwasher: Yes (5), No (0), Unknown (0).

      **SUCCESS JSON STRUCTURE:**
      {"address": "string", "rent": integer, "notes": "string (brief summary)", "guillotine": integer, "neighborhood": integer, "bathroom": integer, "sqft": integer, "parking": integer, "flooring": integer, "storage": integer, "laundry": integer, "dishwasher": integer}
      `;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, '').trim();
      const parsedData = JSON.parse(text);

      // The AI now always returns data, so we can populate the form directly.
      // The guillotine score will handle the ranking.
      setParseError('');
      setFormData(prev => ({ ...prev, ...parsedData }));

    } catch (e) {
      console.error("Error parsing screenshot:", e);
      setParseError(`Failed to parse screenshot. Check the console for details. Error: ${e.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleMicClick = (apt) => {
    // Voice input logic remains the same
  };

  const processVoiceInput = async (aptId, transcript) => {
    // Voice processing logic remains the same
  };

  const handleTriggerScrape = async () => {
    setIsTriggeringScrape(true);
    setScrapeStatus('Triggering workflow...');
    const triggerTime = Date.now();

    try {
      const response = await fetch('/api/trigger-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrape_url: scrapeUrl, addToDaily: addToDaily }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Use the message from the server's JSON response if available
        throw new Error(result.message || `Server responded with ${response.status}`);
      }
      setScrapeStatus(`✅ Success! ${result.message} Now waiting for results...`);
      setScrapeTriggerTime(triggerTime);
    } catch (error) {
      console.error('Failed to trigger scrape:', error);
      setScrapeStatus(`❌ Error: Could not trigger workflow. ${error.message}`);
    } finally {
      setIsTriggeringScrape(false);
    }
  };

  const handleWeightsCalculated = (newWeights) => {
    if (newWeights) {
      // Set the active weights for the session
      setWeights(newWeights);

      // Create a new profile object with a name and timestamp
      const newProfile = {
        id: Date.now(),
        name: `Profile - ${new Date().toLocaleString()}`,
        weights: newWeights,
      };

      // Add the new profile to the list, keeping only the 5 most recent
      setSavedProfiles(prev => [newProfile, ...prev].slice(0, 5));
      setShowWeightConfirmation(true); // Trigger confirmation dialog
    }
    setIsCalculatorOpen(false);
  };

  const handleLoadProfile = (profileWeights) => {
    setWeights(profileWeights);
    setIsCalculatorOpen(false);
  };
  const nextCategory = () => {
    // New category logic remains the same
  };

  const getMapsUrl = (address, type) => {
    const query = encodeURIComponent(`${address}, Santa Barbara, CA`);
    if (type === 'location') return `https://www.google.com/maps/search/?api=1&query=${query}`;
    if (type === 'hospital') return `https://www.google.com/maps/dir/?api=1&origin=${query}&destination=Santa+Barbara+Cottage+Hospital&travelmode=driving`;
    if (type === 'eastbeach') return `https://www.google.com/maps/dir/?api=1&origin=${query}&destination=East+Beach,+Santa+Barbara,+CA&travelmode=bicycling`;
    if (type === 'arroyo') return `https://www.google.com/maps/dir/?api=1&origin=${query}&destination=Arroyo+Burro+Beach+County+Park&travelmode=bicycling`;
    if (type === 'amtrak') return `https://www.google.com/maps/dir/?api=1&origin=${query}&destination=Santa+Barbara+Amtrak+Station&travelmode=bicycling`;
    return '#';
  };

  const getZillowLink = (apt) => {
    if (apt.zillowUrl) return apt.zillowUrl;
    const searchStr = encodeURIComponent(`${apt.address}, Santa Barbara, CA`);
    return `https://www.zillow.com/homes/${searchStr}_rb/`;
  };

  const renderFeatureTags = useCallback((apt) => {
      const tags = [];
      const sqftLabel = INITIAL_SCORING.sqft.find(s => s.value === apt.sqft)?.label.split('(')[0].trim();
      if (sqftLabel && apt.sqft > 0) tags.push(<FeatureTag key="sqft" icon={<Ruler size={14} />} text={sqftLabel} />);
      if (apt.laundry === 10) tags.push(<FeatureTag key="laundry" icon={<WashingMachine size={14} />} text="In-Unit W/D" color="green" />);
      if (apt.laundry === 0) tags.push(<FeatureTag key="laundry-shared" icon={<WashingMachine size={14} />} text="On-Site Laundry" />);
      if (apt.dishwasher === 5) tags.push(<FeatureTag key="dishwasher" icon={<Utensils size={14} />} text="Dishwasher" color="green" />);
      if (apt.parking === 20) tags.push(<FeatureTag key="parking" icon={<Car size={14} />} text="Off-Street Parking" color="green" />);
      if (apt.bathroom === 25) tags.push(<FeatureTag key="bathroom" icon={<CheckCircle2 size={14} />} text="Hallway Bath" color="green" />);
      if (apt.flooring === 10) tags.push(<FeatureTag key="flooring" icon={<CheckCircle2 size={14} />} text="Hard Floors" />);
      if (apt.flooring === 5) tags.push(<FeatureTag key="flooring-carpet" icon={<Ban size={14} />} text="Carpet" color="amber" />);
      if (apt.storage === 10) tags.push(<FeatureTag key="storage" icon={<CheckCircle2 size={14} />} text="Has Storage" />);
      return tags;
  }, []);

  const apartmentsToDisplay = showArchived ? sortedArchivedApartments : sortedApartments;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 md:p-8 relative">
      {showWeightConfirmation && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg z-[100] flex items-center gap-3 animate-fade-in-down">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span className="font-medium">New weights accepted.</span>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Apartment Tracker</h1>
            <p className="text-slate-500 font-medium">v9.8 "Stable Build"</p>
          </div>
          <div className="flex items-center flex-wrap justify-end gap-4">
            {archivedApartments.length > 0 && (
              <button onClick={() => setShowArchived(!showArchived)} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors py-2.5 px-4 rounded-xl hover:bg-slate-100">
                  {showArchived ? <CheckCircle2 size={16} /> : <Archive size={16} />}
                  {showArchived ? 'View Active' : `View Archived (${archivedApartments.length})`}
              </button>
            )}
            {uniqueManagers.length > 2 && (
              <select
                  value={selectedManager}
                  onChange={e => setSelectedManager(e.target.value)}
                  className="text-sm font-medium text-slate-700 bg-white border-slate-300 border rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                  {uniqueManagers.map(manager => (
                      <option key={manager} value={manager}>
                          {manager === 'All' ? 'All Managers' : manager}
                      </option>
                  ))}
              </select>
            )}
            <button onClick={() => setIsGuillotineMenuOpen(true)} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors py-2.5 px-4 rounded-xl hover:bg-slate-100">
                <ShieldAlert size={16} />
                Guillotines
            </button>
            <button onClick={() => setIsCalculatorOpen(true)} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors py-2.5 px-4 rounded-xl hover:bg-slate-100">
                <SlidersHorizontal size={16} />
                Adjust Weights
            </button>
            <button onClick={() => setIsScrapeDialogOpen(true)} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors py-2.5 px-4 rounded-xl hover:bg-slate-100">
                <SearchCode size={16} />
                On-Demand Scrape
            </button>
            { (localStorage.getItem('apartments') || localStorage.getItem('archivedApartments')) && (
              <button onClick={handleResetData} title="Clear all locally saved data and reload" className="text-sm font-medium text-rose-500 hover:text-rose-700 flex items-center gap-2 transition-colors py-2.5 px-4 rounded-xl hover:bg-rose-100/80"><Trash2 size={16} /> Reset Data</button>
            )}
            <button onClick={() => { setFormData(defaultForm); setIsFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm">
              <Plus size={20} /> Add Apartment
            </button>
          </div>
        </header>

        {isScrapeDialogOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsScrapeDialogOpen(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold">On-Demand Scrape</h2>
                        <p className="text-sm text-slate-500 mt-1">Trigger a new scrape for a specific PDF or webpage URL.</p>
                    </div>
                    <div className="p-6">
                        <label htmlFor="scrape-url-input" className="text-sm font-medium text-slate-700">URL to Scrape</label>
                        <input id="scrape-url-input" type="text" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://..." className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                        <div className="mt-4 flex items-center">
                            <input
                                id="add-to-daily-checkbox"
                                type="checkbox"
                                checked={addToDaily}
                                onChange={e => setAddToDaily(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="add-to-daily-checkbox" className="ml-3 block text-sm text-slate-700">Add this URL to the daily scheduled scrape</label>
                        </div>
                        {scrapeStatus && (
                            <div className={`mt-4 p-3 rounded-lg text-sm ${scrapeStatus.includes('Error') ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'}`}>
                                {scrapeStatus}
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
                        <button onClick={() => setIsScrapeDialogOpen(false)} className="text-sm font-medium text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-200">Cancel</button>
                        <button onClick={handleTriggerScrape} disabled={isTriggeringScrape || !scrapeUrl} className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            {isTriggeringScrape && <Loader2 size={16} className="animate-spin" />}
                            {isTriggeringScrape ? 'Triggering...' : 'Scrape Now'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isGuillotineMenuOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsGuillotineMenuOpen(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold">Guillotine Criteria</h2>
                        <p className="text-sm text-slate-500 mt-1">Set hard dealbreakers that will flag a listing.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="max-price-input" className="text-sm font-medium text-slate-700">Max Price</label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <input 
                                    id="max-price-input" 
                                    type="number" 
                                    value={guillotineCriteria.maxPrice} 
                                    onChange={e => setGuillotineCriteria(prev => ({ ...prev, maxPrice: parseInt(e.target.value, 10) || 0 }))} 
                                    className="w-full p-2 pl-7 border border-slate-300 rounded-lg" 
                                />
                            </div>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="street-parking-checkbox"
                                type="checkbox"
                                checked={guillotineCriteria.streetParking}
                                onChange={e => setGuillotineCriteria(prev => ({ ...prev, streetParking: e.target.checked }))}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="street-parking-checkbox" className="ml-3 block text-sm text-slate-700">Flag listings with "Street Parking Only"</label>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
                        <button onClick={() => setIsGuillotineMenuOpen(false)} className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700">Done</button>
                    </div>
                </div>
            </div>
        )}

        {isCalculatorOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto p-4 py-12 flex justify-center">
                <WeightCalculator 
                    onWeightsCalculated={handleWeightsCalculated}
                    onClose={() => setIsCalculatorOpen(false)}
                    savedProfiles={savedProfiles}
                    onLoadProfile={handleLoadProfile}
                />
            </div>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeForm}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold p-6 border-b border-slate-200">{editingApt ? 'Edit Apartment' : 'Add New Apartment'}</h2>
              
              {/* Gemini Screenshot Parser */}
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Sparkles className="text-indigo-500"/> AI Screenshot Parser</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="text-sm font-medium text-slate-700">Gemini API Key</label>
                          <input type="password" value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} placeholder="Enter your API key" className="w-full mt-1 p-2 border border-slate-300 rounded-lg shadow-sm" />
                          <p className="text-xs text-slate-500 mt-1">Your key is stored in-memory and never saved.</p>
                      </div>
                      <div>
                          <label className="text-sm font-medium text-slate-700">Upload Screenshot</label>
                          <div className="mt-1 flex items-center gap-2">
                              <label htmlFor="screenshot-upload" className="cursor-pointer w-full bg-white p-2 border border-slate-300 rounded-lg shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50">
                                  <UploadCloud size={16} className="text-slate-500"/>
                                  <span className="text-sm text-slate-600 truncate">{screenshotFile ? screenshotFile.name : 'Select an image...'}</span>
                              </label>
                              <input id="screenshot-upload" type="file" className="hidden" accept="image/*" onChange={e => setScreenshotFile(e.target.files[0])} />
                          </div>
                      </div>
                  </div>
                  <button onClick={handleParseScreenshot} disabled={isParsing || !screenshotFile || !geminiApiKey} className="mt-4 w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed">
                      {isParsing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                      {isParsing ? 'Analyzing...' : 'Parse with AI'}
                  </button>
                  {parseError && <p className="text-sm text-red-600 mt-2">{parseError}</p>}
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Form Fields */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Address</label>
                    <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Manager</label>
                    <input value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Rent</label>
                    <input type="number" value={formData.rent} onChange={e => setFormData({...formData, rent: e.target.value})} className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                  </div>

                  {Object.entries(INITIAL_SCORING).map(([key, options]) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-slate-700 capitalize">{key}</label>
                      <select value={formData[key]} onChange={e => setFormData({...formData, [key]: parseInt(e.target.value)})} className="w-full mt-1 p-2 border border-slate-300 rounded-lg bg-white">
                        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  ))}

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Notes</label>
                    <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="3" className="w-full mt-1 p-2 border border-slate-300 rounded-lg"></textarea>
                  </div>

                  <div className="md:col-span-2">
                      <h4 className="text-md font-semibold text-slate-800 mb-2 border-t pt-4 mt-2">Commute Times</h4>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Drive to Hospital</label>
                    <input value={formData.driveHospital} onChange={e => setFormData({...formData, driveHospital: e.target.value})} placeholder="e.g., 6 min" className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                  </div>
                   <div>
                    <label className="text-sm font-medium text-slate-700">Bike to East Beach</label>
                    <input value={formData.bikeEastBeach} onChange={e => setFormData({...formData, bikeEastBeach: e.target.value})} placeholder="e.g., 22 min" className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                  </div>
                   <div>
                    <label className="text-sm font-medium text-slate-700">Bike to Arroyo Burro</label>
                    <input value={formData.bikeArroyoBurro} onChange={e => setFormData({...formData, bikeArroyoBurro: e.target.value})} placeholder="e.g., 16 min" className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                  </div>
                   <div>
                    <label className="text-sm font-medium text-slate-700">Bike to Amtrak</label>
                    <input value={formData.bikeAmtrak} onChange={e => setFormData({...formData, bikeAmtrak: e.target.value})} placeholder="e.g., 15 min" className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
                  </div>

                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-4 mt-auto">
                <button onClick={closeForm} className="text-sm font-medium text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-200">Cancel</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700">Save Apartment</button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center p-20 bg-white rounded-2xl shadow-sm">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
            <p className="mt-4 font-medium text-slate-600">Checking for new listings from today's scrape...</p>
          </div>
        ) : (
          <div className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-700">{showArchived ? 'Archived Listings' : 'Active Listings'}</h2>
            </div>

            {/* Card View for Mobile */}
            <div className="grid grid-cols-1 md:hidden gap-6">
              {apartmentsToDisplay.map((apt, index) => (
                <div key={`card-${apt.id}`} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all duration-300 ${apt.calculated.dealbreakers.length > 0 ? 'border-rose-300 bg-rose-50/60' : 'hover:shadow-lg hover:-translate-y-1 border-slate-200'}`}>
                  <div className="p-5 border-b border-slate-200 flex justify-between items-start">
                      <div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${index < 3 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>Rank #{index + 1}</span>
                          <h3 className="text-lg font-bold text-slate-800 mt-2 truncate">
                              <a href={getMapsUrl(apt.address, 'location')} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">{apt.address}</a>
                          </h3>
                          <div className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                              <span>{apt.manager}</span> • <span>${apt.rent}/mo</span> •
                              <a href={getZillowLink(apt)} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-semibold">Zillow <ExternalLink size={12} /></a>
                          </div>
                      </div>
                      <div className="flex-shrink-0 ml-4 text-center">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-inner">
                              <span className="text-3xl font-black tracking-tighter text-indigo-600">{apt.calculated.score}</span>
                              <span className="text-xs text-slate-500 font-medium -mt-1">/ {MAX_SCORE}</span>
                          </div>
                      </div>
                  </div>
                  {apt.calculated.dealbreakers.length > 0 && (
                    <div className="bg-rose-100/50 p-4 border-b border-rose-200"><div className="flex items-center gap-3"><ShieldAlert className="text-rose-600 shrink-0" size={20} /><div><span className="text-sm font-bold text-rose-900 block">Dealbreakers</span><span className="text-xs text-rose-700">{apt.calculated.dealbreakers.join(', ')}</span></div></div></div>
                  )}
                  <div className="p-5 flex-grow">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Features</h4>
                      <div className="flex flex-wrap gap-2">{renderFeatureTags(apt)}</div>
                  </div>
                  {apt.notes && (
                    <div className="px-5 pb-5"><div className="p-4 bg-amber-100/40 rounded-lg flex items-start gap-3 border border-amber-200/60"><Info size={18} className="text-amber-600 shrink-0 mt-0.5" /><p className="text-sm text-amber-900/90 leading-relaxed font-medium">{apt.notes}</p></div></div>
                  )}
                  <div className="p-2 bg-slate-50 border-t border-slate-200 mt-auto">
                      <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                              <a href={getMapsUrl(apt.address, 'hospital')} title="Check drive time to Cottage Hospital" target="_blank" rel="noreferrer" className="flex flex-col items-center p-2 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 rounded-md transition-colors w-20"><Car size={16} /><span className="text-xs font-medium mt-1 text-center leading-tight">Cottage<br/>{apt.driveHospital || 'TBD'}</span></a>
                              <a href={getMapsUrl(apt.address, 'eastbeach')} title="Check bike time to East Beach" target="_blank" rel="noreferrer" className="flex flex-col items-center p-2 text-slate-500 hover:bg-sky-100 hover:text-sky-700 rounded-md transition-colors w-20"><Bike size={16} /><span className="text-xs font-medium mt-1 text-center leading-tight">East Beach<br/>{apt.bikeEastBeach || 'TBD'}</span></a>
                              <a href={getMapsUrl(apt.address, 'arroyo')} title="Check bike time to Arroyo Burro Beach" target="_blank" rel="noreferrer" className="flex flex-col items-center p-2 text-slate-500 hover:bg-teal-100 hover:text-teal-700 rounded-md transition-colors w-20"><Bike size={16} /><span className="text-xs font-medium mt-1 text-center leading-tight">Arroyo Burro<br/>{apt.bikeArroyoBurro || 'TBD'}</span></a>
                              <a href={getMapsUrl(apt.address, 'amtrak')} title="Check bike time to Amtrak Station" target="_blank" rel="noreferrer" className="flex flex-col items-center p-2 text-slate-500 hover:bg-orange-100 hover:text-orange-700 rounded-md transition-colors w-20"><Bike size={16} /><span className="text-xs font-medium mt-1 text-center leading-tight">Amtrak<br/>{apt.bikeAmtrak || 'TBD'}</span></a>
                          </div>
                          {showArchived ? (
                              <div className="flex gap-2"><button onClick={() => restoreApt(apt.id)} title="Restore" className="p-2 text-slate-500 hover:text-green-600 hover:bg-slate-200/60 rounded-md transition-colors"><ArchiveRestore size={16} /></button><button onClick={() => permanentlyDeleteApt(apt.id)} title="Delete Permanently" className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-200/60 rounded-md transition-colors"><Trash2 size={16} /></button></div>
                          ) : (
                              <div className="flex gap-2"><button onClick={() => openEdit(apt)} title="Edit" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition-colors"><Edit2 size={16} /></button><button onClick={() => archiveApt(apt.id)} title="Archive" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-200/60 rounded-md transition-colors"><Archive size={16} /></button></div>
                          )}
                      </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Row View for Desktop */}
            <div className="hidden md:flex flex-col space-y-2">
              {/* Desktop Header */}
              <div className="grid grid-cols-[2.5fr,0.8fr,3fr,1.5fr,2.5fr,0.7fr] gap-x-6 items-center px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">
                <span>Apartment</span>
                <span className="text-center">Score</span>
                <span>Features</span>
                <span className="text-center">Commute</span>
                <span>Notes</span>
                <span className="text-center">Actions</span>
              </div>
              {apartmentsToDisplay.map((apt, index) => (
                <div key={`row-${apt.id}`} className={`grid grid-cols-[2.5fr,0.8fr,3fr,1.5fr,2.5fr,0.7fr] gap-x-6 items-start bg-white rounded-lg shadow-sm border p-4 transition-all duration-300 ${apt.calculated.dealbreakers.length > 0 ? 'border-rose-300 bg-rose-50/60' : 'hover:shadow-md hover:border-slate-300 border-slate-200'}`}>
                  {/* Col 1: Vitals */}
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${index < 3 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>#{index + 1}</span>
                    <h3 className="font-bold text-slate-800 mt-1 truncate">
                      <a href={getMapsUrl(apt.address, 'location')} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">{apt.address}</a>
                    </h3>
                    <div className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                      <span>{apt.manager}</span> • <span>${apt.rent}/mo</span> •
                      <a href={getZillowLink(apt)} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-semibold">Zillow <ExternalLink size={12} /></a>
                    </div>
                  </div>
                  {/* Col 2: Score */}
                  <div className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-inner mx-auto">
                          <span className="text-2xl font-black tracking-tighter text-indigo-600">{apt.calculated.score}</span>
                          <span className="text-xs text-slate-500 font-medium -mt-1">/ {MAX_SCORE}</span>
                      </div>
                  </div>
                  {/* Col 3: Features */}
                  <div className="text-sm">
                    {apt.calculated.dealbreakers.length > 0 && (
                      <div className="flex items-center gap-2 text-rose-700 mb-2"><ShieldAlert size={16} /><span className="font-bold">{apt.calculated.dealbreakers.join(', ')}</span></div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {renderFeatureTags(apt)}
                    </div>
                  </div>
                  {/* Col 4: Commute */}
                  <div className="flex items-center justify-center gap-1">
                      <a href={getMapsUrl(apt.address, 'hospital')} title="Drive to Cottage Hospital" target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center p-1 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 rounded-md transition-colors"><Car size={14} /><span className="text-xs font-medium mt-1 text-center leading-tight">Cottage<br/>{apt.driveHospital || 'TBD'}</span></a>
                      <a href={getMapsUrl(apt.address, 'eastbeach')} title="Bike to East Beach" target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center p-1 text-slate-500 hover:bg-sky-100 hover:text-sky-700 rounded-md transition-colors"><Bike size={14} /><span className="text-xs font-medium mt-1 text-center leading-tight">E. Beach<br/>{apt.bikeEastBeach || 'TBD'}</span></a>
                      <a href={getMapsUrl(apt.address, 'arroyo')} title="Bike to Arroyo Burro Beach" target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center p-1 text-slate-500 hover:bg-teal-100 hover:text-teal-700 rounded-md transition-colors"><Bike size={14} /><span className="text-xs font-medium mt-1 text-center leading-tight">A. Burro<br/>{apt.bikeArroyoBurro || 'TBD'}</span></a>
                      <a href={getMapsUrl(apt.address, 'amtrak')} title="Bike to Amtrak" target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center p-1 text-slate-500 hover:bg-orange-100 hover:text-orange-700 rounded-md transition-colors"><Bike size={14} /><span className="text-xs font-medium mt-1 text-center leading-tight">Amtrak<br/>{apt.bikeAmtrak || 'TBD'}</span></a>
                  </div>
                  {/* Col 5: Notes */}
                  <div className="text-sm">
                    {apt.notes && (
                      <div className="p-2 bg-amber-100/40 rounded-md flex items-start gap-2 border border-amber-200/60 h-full">
                        <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900/90 leading-relaxed font-medium">{apt.notes}</p>
                      </div>
                    )}
                  </div>
                  {/* Col 6: Actions */}
                  <div className="flex items-center justify-center">
                      {showArchived ? (
                          <div className="flex flex-col gap-2"><button onClick={() => restoreApt(apt.id)} title="Restore" className="p-2 text-slate-500 hover:text-green-600 hover:bg-slate-200/60 rounded-md transition-colors"><ArchiveRestore size={16} /></button><button onClick={() => permanentlyDeleteApt(apt.id)} title="Delete Permanently" className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-200/60 rounded-md transition-colors"><Trash2 size={16} /></button></div>
                      ) : (
                          <div className="flex flex-col gap-2"><button onClick={() => openEdit(apt)} title="Edit" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition-colors"><Edit2 size={16} /></button><button onClick={() => archiveApt(apt.id)} title="Archive" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-200/60 rounded-md transition-colors"><Archive size={16} /></button></div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}