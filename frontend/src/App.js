import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MOOD_OPTIONS = [
  { emoji: '😊', name: 'happy', label: 'Happy' },
  { emoji: '😐', name: 'neutral', label: 'Neutral' },
  { emoji: '😢', name: 'sad', label: 'Sad' },
  { emoji: '😡', name: 'angry', label: 'Angry' },
  { emoji: '😰', name: 'anxious', label: 'Anxious' },
  { emoji: '🤔', name: 'thoughtful', label: 'Thoughtful' },
  { emoji: '🥳', name: 'excited', label: 'Excited' },
  { emoji: '😴', name: 'tired', label: 'Tired' }
];

const MoodTracker = () => {
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedMoodName, setSelectedMoodName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [moodEntries, setMoodEntries] = useState([]);
  const [currentView, setCurrentView] = useState('entry'); // 'entry', 'history', 'calendar'
  const [loading, setLoading] = useState(false);

  // Fetch mood entries
  const fetchMoodEntries = async () => {
    try {
      const response = await axios.get(`${API}/moods`);
      setMoodEntries(response.data);
    } catch (error) {
      console.error('Error fetching mood entries:', error);
    }
  };

  // Check if there's already an entry for selected date
  const checkExistingEntry = async (date) => {
    try {
      const response = await axios.get(`${API}/moods/${date}`);
      if (response.data) {
        setSelectedMood(response.data.mood);
        setSelectedMoodName(response.data.mood_name);
        setNotes(response.data.notes || '');
        return true;
      }
      return false;
    } catch (error) {
      // No entry found for this date
      return false;
    }
  };

  useEffect(() => {
    fetchMoodEntries();
  }, []);

  useEffect(() => {
    // Check for existing entry when date changes
    checkExistingEntry(selectedDate);
  }, [selectedDate]);

  const handleMoodSelect = (mood, moodName) => {
    setSelectedMood(mood);
    setSelectedMoodName(moodName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMood) return;

    setLoading(true);
    try {
      await axios.post(`${API}/moods`, {
        mood: selectedMood,
        mood_name: selectedMoodName,
        notes: notes.trim() || null,
        date: selectedDate
      });
      
      // Refresh entries
      await fetchMoodEntries();
      
      // Reset form only if it's today's date
      if (selectedDate === new Date().toISOString().split('T')[0]) {
        setSelectedMood('');
        setSelectedMoodName('');
        setNotes('');
      }
      
      alert('Mood entry saved successfully!');
    } catch (error) {
      console.error('Error saving mood entry:', error);
      alert('Error saving mood entry. Please try again.');
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/moods/export/csv`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mood_tracker_data.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const renderMoodEntry = () => (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">How are you feeling?</h2>
      
      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Mood Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Select your mood:</h3>
        <div className="grid grid-cols-4 gap-4">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.name}
              onClick={() => handleMoodSelect(mood.emoji, mood.name)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                selectedMood === mood.emoji
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-3xl mb-2">{mood.emoji}</div>
              <div className="text-sm font-medium text-gray-700">{mood.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How was your day? Any thoughts or feelings you'd like to record..."
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedMood || loading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          selectedMood && !loading
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {loading ? 'Saving...' : 'Save Mood Entry'}
      </button>
    </div>
  );

  const renderHistory = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Mood History</h2>
        <button
          onClick={handleExport}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          Export CSV
        </button>
      </div>
      
      {moodEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg">No mood entries yet. Start tracking your mood!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {moodEntries.map((entry) => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{entry.mood}</div>
                  <div>
                    <div className="font-medium text-gray-800 capitalize">{entry.mood_name}</div>
                    <div className="text-sm text-gray-500">{entry.date}</div>
                  </div>
                </div>
                {entry.notes && (
                  <div className="max-w-md">
                    <div className="text-sm text-gray-600 italic">"{entry.notes}"</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Create calendar grid
    const calendarDays = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = moodEntries.find(e => e.date === dateStr);
      
      calendarDays.push(
        <div key={day} className="aspect-square p-2 border border-gray-200 hover:bg-gray-50">
          <div className="text-sm font-medium text-gray-800 mb-1">{day}</div>
          {entry && (
            <div className="text-center">
              <div className="text-2xl">{entry.mood}</div>
            </div>
          )}
        </div>
      );
    }
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 bg-gray-100">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 border border-gray-200">
          {calendarDays}
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          Your mood history at a glance 📅
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              Mood Tracker 🌟
            </h1>
            <nav className="flex gap-4">
              <button
                onClick={() => setCurrentView('entry')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'entry'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Track Mood
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'history'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setCurrentView('calendar')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'calendar'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Calendar
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {currentView === 'entry' && renderMoodEntry()}
        {currentView === 'history' && renderHistory()}
        {currentView === 'calendar' && renderCalendar()}
      </main>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <MoodTracker />
    </div>
  );
}

export default App;