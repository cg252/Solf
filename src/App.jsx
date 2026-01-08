import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  setLogLevel,
} from "firebase/firestore";

import Login from "./Login";

// --- Firebase Configuration ---

// STEP 1: Paste your Firebase config object here.
// You get this from your Firebase project console (see setup guide).
const firebaseConfig = {
  apiKey: "AIzaSyCzECpTR6GRjdw790t4NqNtJm3OpRxZwzc",
  authDomain: "solf-81883.firebaseapp.com",
  projectId: "solf-81883",
  storageBucket: "solf-81883.firebasestorage.app",
  messagingSenderId: "440952377654",
  appId: "1:440952377654:web:f1286f36a6f0fffd632397",
  measurementId: "G-EFQ9Z1559E",
};

// This is a simple name for your app's data collections.
// You can leave this as-is.ss -tulpn | grep 5173

const appId = "gurf-surf-logger";

// --- End of Configuration ---

// --- Error Component ---
// Render a helpful error message if config is missing
function MissingConfig() {
  return (
    <div
      style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}
    >
      <h1 style={{ color: "red" }}>Firebase Not Initialized</h1>
      <p>Please paste your `firebaseConfig` object into `App.jsx` (line 20).</p>
      <p>Follow the `react_setup_guide.md` file for instructions.</p>
    </div>
  );
}

// --- Initialize Firebase ---
let app, auth, db;
let firebaseInitializationError = null;

try {
  // A simple check to see if the config is still the placeholder
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_")) {
    throw new Error(
      "Firebase config is missing. Please paste it into `gurf_app_codesandbox.jsx`."
    );
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  setLogLevel("debug"); // Optional: for detailed Firestore logs
} catch (e) {
  console.error(
    "Error initializing Firebase. Did you paste your firebaseConfig?",
    e
  );
  firebaseInitializationError = e;
}

// --- Calendar Component ---
function SessionCalendar({ sessions, onDeleteSession }) {
  const [displayDate, setDisplayDate] = useState(new Date());

  // Group sessions by date for quick lookup
  const sessionsByDate = useMemo(() => {
    const map = new Map();
    sessions.forEach((session) => {
      // Use toLocaleDateString for a simple date key (e.g., "11/17/2025")
      // We parse the ISO string to ensure local time is used for grouping
      const sessionDate = new Date(session.date);
      const dateKey = sessionDate.toLocaleDateString();
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(session);
    });
    return map;
  }, [sessions]);

  // Generate the days for the calendar grid
  const calendarGrid = useMemo(() => {
    const days = [];
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    // 1. Add days from previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    for (let i = 0; i < firstDayOfMonth; i++) {
      const day = daysInPrevMonth - firstDayOfMonth + 1 + i;
      days.push({
        dayNumber: day,
        isCurrentMonth: false,
      });
    }

    // 2. Add days for current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toLocaleDateString();
      const isToday = date.getTime() === today.getTime();

      days.push({
        dayNumber: day,
        isCurrentMonth: true,
        isToday: isToday,
        sessions: sessionsByDate.get(dateKey) || [],
      });
    }

    // 3. Add days from next month
    const totalCells = 42; // 6 rows * 7 cols
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [displayDate, sessionsByDate]);

  const handlePrevMonth = () => {
    setDisplayDate(new Date(displayDate.setMonth(displayDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    setDisplayDate(new Date(displayDate.setMonth(displayDate.getMonth() + 1)));
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
        Session History
      </h2>

      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition"
        >
          &larr; Prev
        </button>
        <h3 className="text-xl font-semibold text-gray-700">
          {displayDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          onClick={handleNextMonth}
          className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition"
        >
          Next &rarr;
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center font-medium text-xs text-gray-500 uppercase pb-2"
          >
            {day}
          </div>
        ))}

        {/* Day Cells */}
        {calendarGrid.map((day, index) => (
          <div
            key={index}
            className={`h-32 border border-gray-200 rounded-lg p-1.5 flex flex-col overflow-y-auto ${
              day.isCurrentMonth ? "bg-white" : "bg-gray-50"
            }`}
          >
            <span
              className={`text-xs font-semibold ${
                day.isCurrentMonth ? "text-gray-700" : "text-gray-400"
              } ${
                day.isToday
                  ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  : ""
              }`}
            >
              {day.dayNumber}
            </span>
            {day.sessions && day.sessions.length > 0 && (
              <div className="mt-1 space-y-1">
                {day.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="text-xs p-1.5 rounded-lg bg-blue-50 text-blue-800 relative group"
                  >
                    <div>
                      <strong>{session.totalWaves}</strong> waves
                    </div>
                    <div
                      className={`font-bold ${
                        session.scoreVsPar < 0
                          ? "text-green-600"
                          : session.scoreVsPar > 0
                          ? "text-red-600"
                          : "text-gray-700"
                      }`}
                    >
                      {session.scoreVsPar > 0 ? "+" : ""}
                      {session.scoreVsPar}
                    </div>
                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="absolute top-0 right-0 p-0.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete session"
                    >
                      {/* Simple 'x' icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main App Component ---
function App() {
  // --- State ---
  // Firebase & Auth
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Session Inputs
  const [birdies, setBirdies] = useState("");
  const [pars, setPars] = useState("");
  const [bogies, setBogies] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");

  // Surfboard Management
  const [surfboards, setSurfboards] = useState([]); // { id, name }
  const [newBoardName, setNewBoardName] = useState("");

  // Session History
  const [sessions, setSessions] = useState([]); // { id, date, ... }

  // Loading/Error State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Paths ---
  // Memoize paths to prevent unnecessary re-renders
  const boardsPath = useMemo(
    () => `artifacts/${appId}/users/${userId}/surfboards`,
    [userId, appId]
  );
  const sessionsPath = useMemo(
    () => `artifacts/${appId}/users/${userId}/sessions`,
    [userId, appId]
  );

  // --- Effects ---

  // 1. Handle Authentication
  useEffect(() => {
    if (firebaseInitializationError) {
      setIsLoading(false);
      return;
    }

    // Listen for auth state changes. If a user exists, store it; otherwise, the app will show the Login screen.
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUserId(usr.uid);
        setUser(usr);
      } else {
        setUserId(null);
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firestore Data
  useEffect(() => {
    // Wait until auth is ready and we have a user ID
    if (!isAuthReady || !userId || firebaseInitializationError) {
      if (isAuthReady) {
        // Auth is ready, but no user. This is a loading state.
        setIsLoading(true);
      }
      return;
    }

    setIsLoading(true);
    let unsubBoards = () => {};
    let unsubSessions = () => {};

    try {
      // Subscribe to Surfboards
      const boardsQuery = query(collection(db, boardsPath));
      unsubBoards = onSnapshot(
        boardsQuery,
        (snapshot) => {
          const boardsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSurfboards(boardsData);
          // Set default selected board if not already set
          if (!selectedBoard && boardsData.length > 0) {
            setSelectedBoard(boardsData[0].id);
          }
        },
        (err) => {
          console.error("Error fetching surfboards:", err);
          setError("Failed to load surfboards.");
        }
      );

      // Subscribe to Sessions
      const sessionsQuery = query(collection(db, sessionsPath));
      unsubSessions = onSnapshot(
        sessionsQuery,
        (snapshot) => {
          const sessionsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Sort by date, newest first (calendar doesn't need this, but good to keep)
          sessionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
          setSessions(sessionsData);
        },
        (err) => {
          console.error("Error fetching sessions:", err);
          setError("Failed to load sessions.");
        }
      );
    } catch (e) {
      console.error("Error setting up subscriptions:", e);
      setError("Failed to connect to database.");
    } finally {
      setIsLoading(false);
    }

    // Cleanup subscriptions
    return () => {
      unsubBoards();
      unsubSessions();
    };
  }, [isAuthReady, userId, boardsPath, sessionsPath, selectedBoard]); // Rerun if auth/paths change

  // --- Calculated Values ---
  const numBirdies = parseInt(birdies) || 0;
  const numPars = parseInt(pars) || 0;
  const numBogies = parseInt(bogies) || 0;

  const totalWaves = numBirdies + numPars + numBogies;
  const scoreVsPar = numBogies - numBirdies;

  // --- Event Handlers ---

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out failed:", e);
      setError("Failed to sign out.");
    }
  };

  const handleLogSession = async (e) => {
    e.preventDefault();
    if (totalWaves === 0 || !selectedBoard || !userId) {
      // Use a simple browser alert.
      window.alert("Please enter at least one wave and select a board.");
      return;
    }

    const boardName =
      surfboards.find((b) => b.id === selectedBoard)?.name || "Unknown Board";

    const newSession = {
      date: new Date().toISOString(), // Store as ISO string
      birdies: numBirdies,
      pars: numPars,
      bogies: numBogies,
      totalWaves,
      scoreVsPar,
      boardId: selectedBoard,
      boardName: boardName,
    };

    try {
      await addDoc(collection(db, sessionsPath), newSession);
      // Clear inputs
      setBirdies("");
      setPars("");
      setBogies("");
    } catch (e) {
      console.error("Error adding session: ", e);
      setError("Failed to save session.");
    }
  };

  const handleAddBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim() || !userId) return;

    try {
      await addDoc(collection(db, boardsPath), { name: newBoardName.trim() });
      setNewBoardName("");
    } catch (e) {
      console.error("Error adding board: ", e);
      setError("Failed to save board.");
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (!userId) return;
    // Simple confirmation dialog
    if (
      !window.confirm(
        "Are you sure you want to delete this board? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, boardsPath, boardId));
      // If the deleted board was selected, reset selection
      if (selectedBoard === boardId) {
        setSelectedBoard(surfboards.length > 1 ? surfboards[0].id : "");
      }
    } catch (e) {
      console.error("Error deleting board: ", e);
      setError("Failed to delete board.");
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to delete this session?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, sessionsPath, sessionId));
    } catch (e) {
      console.error("Error deleting session: ", e);
      setError("Failed to delete session.");
    }
  };

  // --- Render ---

  if (error) {
    return (
      <div className="min-h-screen bg-red-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-4">
            An Error Occurred
          </h2>
          <p className="text-gray-700">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  if ((!isAuthReady || isLoading) && !firebaseInitializationError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-blue-500 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">
            Loading Your Sessions...
          </h2>
          <p className="text-gray-500">
            {!isAuthReady ? "Authenticating..." : "Fetching data..."}
          </p>
        </div>
      </div>
    );
  }

  // If auth finished initializing and there's no user, show the Login screen
  if (isAuthReady && !userId && !firebaseInitializationError) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* --- Header --- */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-blue-700">Solf</h1>
          <p className="text-xl text-gray-600 mt-1">Log Your Surf Sessions</p>
          <p className="text-xs text-gray-400 mt-2 truncate" title={user?.email || userId}>
            {user?.email ? `Signed in as ${user.email}` : `Your User ID: ${userId}`}
          </p>
          {user && (
            <div className="mt-3">
              <button onClick={handleSignOut} className="text-sm text-gray-600 underline">
                Sign out
              </button>
            </div>
          )}
        </header>

        {/* --- Log Session Card --- */}
        <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
            Log Today's Session
          </h2>
          <form onSubmit={handleLogSession}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Birdies */}
              <div>
                <label
                  htmlFor="birdies"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Birdies 🐦
                </label>
                <input
                  type="number"
                  id="birdies"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0"
                  value={birdies}
                  onChange={(e) => setBirdies(e.target.value)}
                />
              </div>
              {/* Pars */}
              <div>
                <label
                  htmlFor="pars"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Pars 🌊
                </label>
                <input
                  type="number"
                  id="pars"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0"
                  value={pars}
                  onChange={(e) => setPars(e.target.value)}
                />
              </div>
              {/* Bogies */}
              <div>
                <label
                  htmlFor="bogies"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Bogies 🐢
                </label>
                <input
                  type="number"
                  id="bogies"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0"
                  value={bogies}
                  onChange={(e) => setBogies(e.target.value)}
                />
              </div>
            </div>

            {/* Board Selector */}
            <div className="mb-6">
              <label
                htmlFor="surfboard"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Surfboard Used
              </label>
              <select
                id="surfboard"
                className="w-full p-3 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
                disabled={surfboards.length === 0}
              >
                {surfboards.length === 0 ? (
                  <option>Add a board first!</option>
                ) : (
                  surfboards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* --- Calculated Totals --- */}
            <div className="bg-blue-50 rounded-lg p-4 flex justify-around items-center mb-6">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Waves</p>
                <p className="text-3xl font-bold text-blue-900">{totalWaves}</p>
              </div>
              <div className="border-l border-blue-200 h-12"></div>
              <div>
                <p className="text-sm text-blue-700 font-medium">
                  Score vs. Par
                </p>
                <p
                  className={`text-3xl font-bold ${
                    scoreVsPar < 0
                      ? "text-green-600"
                      : scoreVsPar > 0
                      ? "text-red-600"
                      : "text-blue-900"
                  }`}
                >
                  {scoreVsPar > 0 ? "+" : ""}
                  {scoreVsPar}
                </p>
              </div>
            </div>

            {/* --- Submit Button --- */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
              disabled={totalWaves === 0 || !selectedBoard}
            >
              Log Session
            </button>
          </form>
        </div>

        {/* --- Surfboard Garage Card --- */}
        <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
            Surfboard Garage
          </h2>
          {/* Add Board Form */}
          <form onSubmit={handleAddBoard} className="flex gap-4 mb-4">
            <input
              type="text"
              className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 7' Funboard"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
            />
            <button
              type="submit"
              className="bg-gray-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
            >
              Add Board
            </button>
          </form>
          {/* Board List */}
          <ul className="space-y-2">
            {surfboards.length === 0 && (
              <li className="text-center text-gray-500 italic py-2">
                Your garage is empty.
              </li>
            )}
            {surfboards.map((board) => (
              <li
                key={board.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
              >
                <span className="text-gray-900">{board.name}</span>
                <button
                  onClick={() => handleDeleteBoard(board.id)}
                  className="text-red-500 hover:text-red-700 font-medium text-sm"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* --- Session History Card --- */}
        <SessionCalendar
          sessions={sessions}
          onDeleteSession={handleDeleteSession}
        />
      </div>
    </div>
  );
}

// --- Final Export ---
// Conditionally choose which component to export
const ComponentToExport = firebaseInitializationError ? MissingConfig : App;

export default ComponentToExport;
