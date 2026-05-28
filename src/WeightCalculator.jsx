import React, { useState, useEffect, useCallback } from 'react';

const QUESTIONS = [
  {
    id: 'bathroom',
    title: 'Hosting & Privacy',
    sliderLabel: 'Bathroom outside of bedroom',
    text: 'How critical is it that guests can access the bathroom from the hallway without walking through your bedroom?',
    lowLabel: 'We rarely host / not a big deal',
    highLabel: 'Absolute dealbreaker for privacy',
  },
  {
    id: 'sqft',
    title: 'Space & Serenity',
    sliderLabel: 'Sq. Ft.',
    text: 'How important is having a massive footprint (700+ sq ft) versus just passing the 550 sq ft minimum?',
    lowLabel: 'We can manage in a cozy space',
    highLabel: 'We need breathing room',
  },
  {
    id: 'neighborhood',
    title: 'Neighborhood & Vibe',
    sliderLabel: 'Neighborhood Location',
    text: 'How important is being right in Downtown or Oak Park vs. being further out in San Roque or Hope?',
    lowLabel: 'Willing to commute from further out',
    highLabel: 'Premium location is everything',
  },
  {
    id: 'parking',
    title: 'Parking Infrastructure',
    sliderLabel: 'Off-Street Parking',
    text: 'How important is it to have a parking spot, if there could be a lot of street parking available?',
    lowLabel: 'Street parking is fine',
    highLabel: 'Will not hunt for parking after work',
  },
  {
    id: 'hospital',
    title: 'Residency Commute',
    sliderLabel: 'Hospital E-bike Commute',
    text: 'How vital is a sub-5-minute e-bike ride to Cottage Hospital for Selin’s post-call recovery? (every location in Santa Barbara is 12 minutes or less driving)',
    lowLabel: 'A 10-15 min ride is fine',
    highLabel: 'Needs to be practically next door',
  },
  {
    id: 'flooring',
    title: 'Allergies & E-Bikes',
    sliderLabel: 'Hard Floors',
    text: 'How critical are hard floors (wood/laminate) for avoiding carpet allergens?',
    lowLabel: 'Carpet is completely fine',
    highLabel: 'Must have hard floors',
  },
  {
    id: 'storage',
    title: 'Extra Storage',
    sliderLabel: 'Dedicated Storage',
    text: 'How important is a dedicated external storage?',
    lowLabel: 'Not a necessity',
    highLabel: 'Need the extra space',
  },
  {
    id: 'amtrak',
    title: 'LA Rail Commute',
    sliderLabel: 'Amtrak Commute',
    text: 'How important is a flat, sub-4-mile e-bike ride to the Amtrak station for Rob’s LA trips?',
    lowLabel: 'I can pedal a bit further',
    highLabel: 'Needs to be a fast, painless ride',
  },
  {
    id: 'laundry',
    title: 'Weekend Time Savings',
    sliderLabel: 'In-Unit Laundry',
    text: 'How much do you value having an In-Unit Washer/Dryer versus just a shared on-site laundry room?',
    lowLabel: 'Shared on-site is fine',
    highLabel: 'In-unit is a massive priority',
  },
  {
    id: 'dishwasher',
    title: 'Daily Convenience',
    sliderLabel: 'Dishwasher',
    text: 'How much do you value having a full-size dishwasher vs small one from Amazon?',
    lowLabel: 'Smaller is fine',
    highLabel: 'Huge quality of life upgrade',
  }
];

// This pure function calculates weights from the 1-10 survey answers.
// It's moved outside the component to be a reusable helper.
const getInitialWeightsFromAnswers = (currentAnswers) => {
  const totalRaw = Object.values(currentAnswers).reduce((acc, val) => acc + val, 0);
  if (totalRaw === 0) return {};

  let calculatedWeights = {};
  let currentSum = 0;
  
  const keys = Object.keys(currentAnswers);
  keys.forEach((key) => {
    let weight = Math.round((currentAnswers[key] / totalRaw) * 400);
    calculatedWeights[key] = weight;
    currentSum += weight;
  });

  const difference = 400 - currentSum;
  if (difference !== 0) {
    const highestKey = Object.keys(calculatedWeights).reduce((a, b) => 
      calculatedWeights[a] > calculatedWeights[b] ? a : b
    );
    calculatedWeights[highestKey] += difference;
  }
  return calculatedWeights;
};

export default function WeightCalculator({ onWeightsCalculated, onClose, savedProfiles, onLoadProfile }) {
  const [step, setStep] = useState(-1);
  const [isDirectEdit, setIsDirectEdit] = useState(false);
  const [isTieredEdit, setIsTieredEdit] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);

  const [answers, setAnswers] = useState({
    bathroom: 5, sqft: 5, neighborhood: 5, parking: 5, hospital: 5,
    flooring: 5, storage: 5, amtrak: 5, laundry: 5, dishwasher: 5
  });
  
  const [weights, setWeights] = useState({});
  const [orderedList, setOrderedList] = useState([]); // For Tiered Ranking
  const [copied, setCopied] = useState(false);

  const calculateWeights = useCallback(() => {
    setWeights(getInitialWeightsFromAnswers(answers));
  }, [answers]);

  useEffect(() => {
    if (step === QUESTIONS.length && !isDirectEdit && !isTieredEdit) {
      calculateWeights();
    }
  }, [step, isDirectEdit, isTieredEdit, calculateWeights]);

  const handleDirectWeightChange = useCallback((keyToChange, newValue) => {
    let val = Math.max(0, Math.min(400, parseInt(newValue) || 0));
    const oldVal = weights[keyToChange];
    let delta = val - oldVal;

    if (delta === 0) return;

    let newWeights = { ...weights, [keyToChange]: val };
    let otherKeys = Object.keys(weights).filter(k => k !== keyToChange);
    let sumOthers = otherKeys.reduce((acc, k) => acc + weights[k], 0);

    if (sumOthers === 0) {
      let addPerItem = Math.floor(Math.abs(delta) / otherKeys.length);
      otherKeys.forEach(k => newWeights[k] = addPerItem);
      
      let currentSum = Object.values(newWeights).reduce((a, b) => a + b, 0);
      newWeights[otherKeys[0]] += (400 - currentSum); 
    } else {
      let newSumOthers = 400 - val;
      let currentNewSum = val;

      otherKeys.forEach(k => {
        let proportion = weights[k] / sumOthers;
        let targetVal = Math.round(newSumOthers * proportion);
        newWeights[k] = targetVal;
        currentNewSum += targetVal;
      });

      let difference = 400 - currentNewSum;
      if (difference !== 0) {
        let largestOtherKey = otherKeys.reduce((a, b) => newWeights[a] > newWeights[b] ? a : b);
        newWeights[largestOtherKey] = Math.max(0, newWeights[largestOtherKey] + difference);
      }
    }

    setWeights(newWeights);
  }, [weights]);

  // Rank-Sum Math Engine for Tiered Ranking
  const calculateTieredWeights = useCallback((list) => {
    const N = list.length;
    const sumOfRanks = (N * (N + 1)) / 2; // Sum of 1 through 10 = 55
    let newWeights = {};
    let currentSum = 0;

    list.forEach((id, index) => {
      const rank = index + 1;
      const reverseRank = N - rank + 1; // 1st place gets 10 points, 10th place gets 1
      let weight = Math.round((reverseRank / sumOfRanks) * 400);
      newWeights[id] = weight;
      currentSum += weight;
    });

    // Fix rounding drift
    const diff = 400 - currentSum;
    if (diff !== 0) {
      newWeights[list[0]] += diff; // Append any slight rounding remainder to the #1 priority
    }
    setWeights(newWeights);
  }, []);

  const startTieredEdit = () => {
    const sortedIds = Object.keys(weights).sort((a, b) => weights[b] - weights[a]);
    setOrderedList(sortedIds);
    setIsTieredEdit(true);
    calculateTieredWeights(sortedIds); // Apply the math immediately
  };

  const moveTierItem = useCallback((index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === orderedList.length - 1) return;

    const newList = [...orderedList];
    const item = newList[index];
    newList.splice(index, 1); // remove
    newList.splice(direction === 'up' ? index - 1 : index + 1, 0, item); // insert

    setOrderedList(newList);
    calculateTieredWeights(newList); // Recalculate 400 points based on new order
  }, [orderedList, calculateTieredWeights]);

  const handleSliderChange = (e, id) => {
    setAnswers({
      ...answers,
      [id]: parseInt(e.target.value)
    });
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);
  
  const reset = () => {
    setStep(-1);
    setIsDirectEdit(false);
    setIsTieredEdit(false);
    setShowProfiles(false);
    setCopied(false);
    setAnswers({ bathroom: 5, sqft: 5, neighborhood: 5, parking: 5, hospital: 5, flooring: 5, storage: 5, amtrak: 5, laundry: 5, dishwasher: 5 });
  };

  const copyToClipboard = () => {
    const jsonStr = JSON.stringify(weights, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Unable to copy', err);
    });
  };

  const startWithTiers = () => {
    const initialWeights = getInitialWeightsFromAnswers(answers);
    const sortedIds = Object.keys(initialWeights).sort((a, b) => initialWeights[b] - initialWeights[a]);
    
    setOrderedList(sortedIds);
    calculateTieredWeights(sortedIds); // This calculates and sets the final weights based on rank
    
    setStep(QUESTIONS.length);
    setIsTieredEdit(true);
  };

  const startWithSliders = () => {
    setWeights(getInitialWeightsFromAnswers(answers)); // Use default answers for baseline
    setStep(QUESTIONS.length);
    setIsDirectEdit(true);
  };

  if (showProfiles) {
    return (
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 my-auto">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Load Saved Profile</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Select one of your 5 most recent scoring models.</p>

        <div className="space-y-3">
          {savedProfiles && savedProfiles.length > 0 ? (
            savedProfiles.map(profile => (
              <div key={profile.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <div>
                  <p className="font-semibold text-slate-300">Saved Profile</p>
                  <p className="text-xs text-slate-500">{profile.name}</p>
                </div>
                <button
                  onClick={() => onLoadProfile(profile.weights)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-5 rounded-lg transition-colors"
                >
                  Load
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400 py-8">You have no saved profiles yet.</p>
          )}
        </div>

        <div className="text-center mt-8">
          <button onClick={() => setShowProfiles(false)} className="text-sm text-slate-400 hover:text-slate-200">Back to Main Menu</button>
        </div>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 text-center border border-slate-700 my-auto">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Scorecard Calibrator</h1>
          <p className="text-slate-400 mb-8 leading-relaxed text-sm">
            Choose your method to generate the <strong>400-point</strong> scoring architecture.
          </p>
          
          <div className="space-y-4 text-left">
            <button onClick={nextStep} className="w-full text-left p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/50 transition-all duration-200 transform hover:scale-105">
                <h3 className="font-bold text-blue-300">Start Questionnaire (Recommended)</h3>
                <p className="text-sm text-slate-400 mt-1">A 10-question guided survey to establish a baseline for your priorities.</p>
            </button>
            
            <button onClick={startWithTiers} className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all duration-200">
                <h3 className="font-bold text-white">Rank by Tiers</h3>
                <p className="text-sm text-slate-400 mt-1">For decisive users: directly rank features from most to least important.</p>
            </button>

            <button onClick={startWithSliders} className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all duration-200">
                <h3 className="font-bold text-white">Fine-Tune Sliders</h3>
                <p className="text-sm text-slate-400 mt-1">For hands-on users: jump straight to the proportional sliders.</p>
            </button>

            <button onClick={() => setShowProfiles(true)} className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all duration-200">
                <h3 className="font-bold text-white">Load a Saved Profile</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Select from your {savedProfiles?.length || 0} most recent scoring models.
                </p>
            </button>
          </div>

          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200 mt-8">
            Cancel
          </button>
      </div>
    );
  }

  if (step === QUESTIONS.length && isDirectEdit) { // 2. Direct Slider Screen
    return ( 
      <div className="max-w-4xl w-full bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Fine-Tune Weights</h2>
            <p className="text-slate-400 text-sm">Drag any slider. The engine proportionally adjusts all others to guarantee exactly 400 total points.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUESTIONS.map(q => (
              <div key={q.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex justify-between text-sm mb-3">
                  <span className="font-semibold text-slate-300 truncate pr-2">{q.sliderLabel}</span>
                  <span className="font-bold text-blue-400 whitespace-nowrap">{weights[q.id] || 0} <span className="text-slate-500 text-xs font-normal">pts</span></span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="400"
                  value={weights[q.id] || 0}
                  onChange={(e) => handleDirectWeightChange(q.id, e.target.value)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-6 border-t border-slate-700 mt-6">
             <button 
                onClick={() => setIsDirectEdit(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-500/30 w-full md:w-auto"
              >
                Lock & View Results
              </button>
          </div>
      </div>
    );
  }
  
  if (step === QUESTIONS.length && isTieredEdit) { // 3. Tiered Ranking Screen
    return (
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-700">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Rank by Tier</h2>
            <p className="text-slate-400 text-sm">Move your highest priorities to the top. The math engine automatically distributes 400 points using a Rank-Sum formula.</p>
          </div>
          
          <div className="space-y-3">
            {orderedList.map((id, index) => {
              const q = QUESTIONS.find(q => q.id === id);
              return (
                <div key={id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${index === 0 ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-900/50 border-slate-700/50'}`}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`text-xl font-black w-8 text-right ${index === 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className={`font-semibold ${index === 0 ? 'text-white' : 'text-slate-300'}`}>{q.sliderLabel}</div>
                      <div className="text-xs text-blue-400 font-bold mt-1 bg-blue-950/50 inline-block px-2 py-0.5 rounded text-left">
                        Calculated: {weights[id]} pts
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 ml-4">
                    <button onClick={() => moveTierItem(index, 'up')} disabled={index === 0} className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Move Up">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button onClick={() => moveTierItem(index, 'down')} disabled={index === orderedList.length - 1} className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Move Down">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-8 border-t border-slate-700 mt-8">
             <button onClick={() => setIsTieredEdit(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-colors duration-200 shadow-lg shadow-emerald-500/30 w-full md:w-auto">
                Lock Tiered Distribution
              </button>
          </div></div>
    );
  }

  if (step === QUESTIONS.length && !isDirectEdit && !isTieredEdit) { // 4. Final Results Screen
    const sortedWeights = Object.fromEntries(
      Object.entries(weights).sort(([,a], [,b]) => b - a)
    );

    return (
      <>
        <div className="max-w-3xl w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">v9.2 Scorecard Architecture</h2>
          &lt;p className="text-slate-400 text-center mb-8 text-sm"&gt;Mathematically normalized to exactly 400 total points.&lt;/p&gt;
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-300 border-b border-slate-700 pb-2">Weight Distribution</h3>
              <div className="pr-2 space-y-3">
                {Object.entries(sortedWeights).map(([key, value]) => {
                  const q = QUESTIONS.find(q => q.id === key);
                  const displayLabel = q ? q.sliderLabel : key;
                  
                  return (
                    <div key={key} className="flex flex-col">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400 font-medium">{displayLabel}</span>
                        <span className="font-bold text-blue-400">{value} pts</span>
                      </div>
                      <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                          style={{ width: `${(value / 400) * 100}%` }} 
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 relative flex flex-col border border-slate-800">
              <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-500 font-mono">weights.json (400 Scale)</span>
                <button 
                  onClick={copyToClipboard}
                  className={`text-xs px-3 py-1.5 rounded transition font-medium ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'}`}
                >
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="text-xs text-emerald-400 font-mono flex-1">
                {JSON.stringify(weights, null, 2)}
              </pre>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-700 space-y-4">
            <div className="flex flex-wrap justify-center gap-3">
             <button
                onClick={() => setIsDirectEdit(true)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
              >
                Fine-Tune Sliders
              </button>
              <button 
                onClick={startTieredEdit}
                className="bg-blue-900/50 hover:bg-blue-800/60 border border-blue-500/30 text-blue-300 hover:text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm shadow-sm flex items-center gap-2"
              >
                Rank by Tiers
              </button>
             <button
                onClick={reset}
                className="text-slate-400 hover:text-white font-medium px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors text-sm"
              >
                Restart Survey
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 pt-2">
                <button onClick={onClose} className="text-sm font-medium text-slate-400 py-2.5 px-5 rounded-xl hover:text-white">Cancel</button>
                <button onClick={() => onWeightsCalculated(weights)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors duration-200 shadow-lg shadow-emerald-500/30">
                    Save & Use Weights
                </button>
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          /* Custom scrollbar styles are no longer needed here as the parent controls scrolling */
        `}} />
      </>
    );
  }

  const currentQ = QUESTIONS[step]; // 5. Survey Screens
  const progress = ((step) / QUESTIONS.length) * 100;

  return (
    <div className="max-w-lg w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 my-auto">
        
        <div className="h-1.5 w-full bg-slate-700">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="p-8 text-center">
          <span className="text-xs font-bold text-blue-500 tracking-widest uppercase mb-3 block">
            {currentQ.title} <span className="text-slate-500 ml-2">({step + 1}/{QUESTIONS.length})</span>
          </span>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-8 h-20 flex items-center justify-center leading-snug">
            {currentQ.text}
          </h2>

          <div className="mb-12 mt-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
            <div className="flex justify-between mb-6 text-xs font-medium text-slate-400">
              <span className="w-1/3 text-left leading-tight">{currentQ.lowLabel}</span>
              <span className="w-1/3 text-right leading-tight">{currentQ.highLabel}</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="10" 
              value={answers[currentQ.id]} 
              onChange={(e) => handleSliderChange(e, currentQ.id)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <div className="mt-8">
               <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600">
                 {answers[currentQ.id]}
               </span>
               <span className="text-slate-500 text-sm ml-2 font-medium">/ 10</span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button 
              onClick={prevStep}
              className={`px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors text-sm ${step === 0 ? 'invisible' : 'visible'}`}
            >
              Back
            </button>
            <button 
              onClick={nextStep}
              className="bg-slate-100 hover:bg-white text-slate-900 font-bold py-3 px-8 rounded-xl transition-colors duration-200"
            >
              {step === QUESTIONS.length - 1 ? 'Lock & Calculate' : 'Next'}
            </button>
          </div>
        </div>
    </div>
  );
}