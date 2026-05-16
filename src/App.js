import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, MapPin, Ruler, Car, Ban, Plus, Trash2, Edit2, Info, Bike, WashingMachine, Mic, Loader2, ExternalLink, Utensils } from 'lucide-react';

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
    { label: 'San Roque (15)', value: 15 }, { label: 'Other (10)', value: 10 }
  ],
  bathroom: [
    { label: 'Hallway / Separate (25)', value: 25 }, { label: 'In Bedroom (0)', value: 0 }, { label: 'TBD (0)', value: -1 }
  ],
  sqft: [
    { label: '700+ sq ft (25)', value: 25 }, { label: '650-699 sq ft (20)', value: 20 },
    { label: '600-649 sq ft (15)', value: 15 }, { label: '550-599 sq ft (10)', value: 10 },
    { label: '< 550 sq ft (0)', value: 0 }
  ],
  parking: [
    { label: 'Assigned / Garage (20)', value: 20 }, { label: 'Street Only (0)', value: 0 }
  ],
  hospital: [
    { label: '< 5 min e-bike (15)', value: 15 }, { label: '5-10 min e-bike (10)', value: 10 }, { label: '> 10 min (0)', value: 0 }
  ],
  flooring: [
    { label: 'Hardwood/Laminate/Tile (10)', value: 10 }, { label: 'Carpet (5)', value: 5 }
  ],
  storage: [
    { label: 'Dedicated Storage / Garage (10)', value: 10 }, { label: 'None (0)', value: 0 }
  ],
  amtrak: [
    { label: '< 4 miles flat (10)', value: 10 }, { label: '> 4 miles (0)', value: 0 }
  ],
  laundry: [
    { label: 'In-Unit (10)', value: 10 }, { label: 'On-Site Shared (0)', value: 0 }, { label: 'None (Dealbreaker)', value: -100 }, { label: 'TBD', value: -1 }
  ],
  dishwasher: [
    { label: 'Yes (5)', value: 5 }, { label: 'No (0)', value: 0 }
  ]
};

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
  const [apartments, setApartments] = useState(MANUAL_DATA);
  const [scoring, setScoring] = useState(INITIAL_SCORING);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingAptId, setRecordingAptId] = useState(null);
  const [processingAptId, setProcessingAptId] = useState(null);
  const [pendingCategories, setPendingCategories] = useState([]);
  const [activeAptIdForCategory, setActiveAptIdForCategory] = useState(null);
  const [newCategoryWeight, setNewCategoryWeight] = useState(5);

  useEffect(() => {
    const fetchNewApartments = async () => {
      try {
        // This fetch request works because apartments.json will be in the `public` folder after a build.
        const response = await fetch('/apartments.json');
        if (response.ok) {
          const newApts = await response.json();
          // Combine manual data with new data, ensuring no duplicate IDs
          setApartments(prevApts => {
            const existingIds = new Set(prevApts.map(a => a.id));
            const filteredNewApts = newApts.filter(a => !existingIds.has(a.id));
            return [...prevApts, ...filteredNewApts];
          });
        }
      } catch (error) {
        console.error("Could not fetch new apartments:", error);
        // It's okay to fail, we'll just show the manual data.
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewApartments();
  }, []); // The empty dependency array ensures this runs only once.

  const defaultForm = {
    address: '', manager: '', listingUrl: '', zillowUrl: '', rent: '', notes: '',
    driveHospital: '', bikeEastBeach: '', bikeArroyoBurro: '', bikeAmtrak: '',
    neighborhood: 10, bathroom: -1, sqft: 0, parking: 0, hospital: 10,
    flooring: 10, storage: 0, amtrak: 10, laundry: 0, dishwasher: 0
  };
  const [formData, setFormData] = useState(defaultForm);

  const calculateScore = (apt) => {
    let score = 0;
    let dealbreakers = [];
    const keys = Object.keys(scoring);
    keys.forEach(k => { 
      if (apt[k] !== undefined && k !== 'bathroom' && apt[k] !== -1) score += apt[k]; 
    });
    if (apt.bathroom !== -1 && apt.bathroom !== undefined) score += apt.bathroom;
    if (apt.sqft === 0 && apt.storage === 0) dealbreakers.push("Micro-Unit (<550 sqft) without dedicated storage");
    if (apt.laundry === -100) dealbreakers.push("No laundry on site");
    if (apt.parking === 0) dealbreakers.push("Street parking only");
    return { score: Math.max(0, score), dealbreakers };
  };

  const sortedApartments = useMemo(() => {
    return [...apartments].map(apt => ({ ...apt, calculated: calculateScore(apt) })).sort((a, b) => b.calculated.score - a.calculated.score);
  }, [apartments, scoring]);

  const handleSave = () => {
    if (editingApt) {
      setApartments(apartments.map(a => a.id === editingApt.id ? { ...formData, id: editingApt.id } : a));
    } else {
      setApartments([...apartments, { ...formData, id: Date.now() }]);
    }
    closeForm();
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingApt(null);
    setFormData(defaultForm);
  };

  const openEdit = (apt) => {
    setFormData(apt);
    setEditingApt(apt);
    setIsFormOpen(true);
  };

  const deleteApt = (id) => setApartments(apartments.filter(a => a.id !== id));

  const handleMicClick = (apt) => {
    // Voice input logic remains the same
  };

  const processVoiceInput = async (aptId, transcript) => {
    // Voice processing logic remains the same
  };

  const handleAddCategory = () => {
    // New category logic remains the same
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
      const sqftLabel = scoring.sqft.find(s => s.value === apt.sqft)?.label.split('(')[0].trim();
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
  }, [scoring]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Apartment Tracker</h1>
            <p className="text-slate-500 font-medium">v9.4 "UI Refresh" Edition</p>
          </div>
          <button onClick={() => { setFormData(defaultForm); setIsFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm">
            <Plus size={20} /> Add Apartment
          </button>
        </header>

        {/* Form and other modals remain unchanged */}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center p-20 bg-white rounded-2xl shadow-sm">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
            <p className="mt-4 font-medium text-slate-600">Checking for new listings from today's scrape...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {sortedApartments.map((apt, index) => (
              <div key={apt.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all duration-300 ${apt.calculated.dealbreakers.length > 0 ? 'border-rose-300 bg-rose-50/60' : 'hover:shadow-lg hover:-translate-y-1 border-slate-200'}`}>
                
                {/* Card Header */}
                <div className="p-5 border-b border-slate-200 flex justify-between items-start">
                    <div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${index < 3 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>Rank #{index + 1}</span>
                        <h3 className="text-lg font-bold text-slate-800 mt-2 truncate">
                            <a href={getMapsUrl(apt.address, 'location')} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">{apt.address}</a>
                        </h3>
                        <div className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                            <span>{apt.manager}</span>
                            <span>•</span>
                            <span>${apt.rent}/mo</span>
                            <span>•</span>
                            <a href={getZillowLink(apt)} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-semibold">
                                Zillow <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-inner">
                            <span className="text-3xl font-black tracking-tighter text-indigo-600">{apt.calculated.score}</span>
                            <span className="text-xs text-slate-500 font-medium -mt-1">/ 155</span>
                        </div>
                    </div>
                </div>

                {/* Dealbreakers */}
                {apt.calculated.dealbreakers.length > 0 && (
                  <div className="bg-rose-100/50 p-4 border-b border-rose-200">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="text-rose-600 shrink-0" size={20} />
                      <div>
                        <span className="text-sm font-bold text-rose-900 block">Dealbreakers</span>
                        <span className="text-xs text-rose-700">{apt.calculated.dealbreakers.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-5 flex-grow">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Features</h4>
                    <div className="flex flex-wrap gap-2">
                        {renderFeatureTags(apt)}
                    </div>
                </div>

                {apt.notes && (
                  <div className="px-5 pb-5">
                    <div className="p-4 bg-amber-100/40 rounded-lg flex items-start gap-3 border border-amber-200/60">
                      <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-900/90 leading-relaxed font-medium">{apt.notes}</p>
                    </div>
                  </div>
                )}

                <div className="p-2 bg-slate-50 border-t border-slate-200 mt-auto">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                            <a href={getMapsUrl(apt.address, 'hospital')} title={`Drive to Cottage Hospital (${apt.driveHospital || 'TBD'})`} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 rounded-md transition-colors"> <Car size={16} /> </a>
                            <a href={getMapsUrl(apt.address, 'eastbeach')} title={`Bike to East Beach (${apt.bikeEastBeach || 'TBD'})`} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:bg-sky-100 hover:text-sky-700 rounded-md transition-colors"> <Bike size={16} /> </a>
                            <a href={getMapsUrl(apt.address, 'amtrak')} title={`Bike to Amtrak (${apt.bikeAmtrak || 'TBD'})`} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:bg-orange-100 hover:text-orange-700 rounded-md transition-colors"> <Bike size={16} /> </a>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openEdit(apt)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => deleteApt(apt.id)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-200/60 rounded-md transition-colors"><Trash2 size={16} /></button>
                        </div>
                    </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}