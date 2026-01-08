import React, { useState } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, setDoc, collection, addDoc, getDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const appId = "gurf-surf-logger"; // keep in sync with App.jsx

export default function Login() {
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Sign-up specific state ---
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [stance, setStance] = useState("regular"); // 'regular' or 'goofy'
  const [avatarFile, setAvatarFile] = useState(null);
  const [boards, setBoards] = useState([]); // list of board names
  const [locations, setLocations] = useState([]); // list of location names
  const [boardInput, setBoardInput] = useState("");
  const [locationInput, setLocationInput] = useState("");


  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const uid = u.uid;

      // Ensure profile doc exists so avatar and basic metadata are available to the app.
      const profileRef = doc(db, "artifacts", appId, "users", uid, "profile", "meta");
      const snap = await getDoc(profileRef);
      if (!snap.exists()) {
        // If Google provides a photoURL, try to fetch it and upload to our Storage bucket so we serve from our domain
        let avatarUrl = null;
        if (u.photoURL) {
          try {
            const resp = await fetch(u.photoURL);
            const blob = await resp.blob();
            const avatarRef = storageRef(storage, `artifacts/${appId}/users/${uid}/avatar_${Date.now()}`);
            await uploadBytes(avatarRef, blob);
            avatarUrl = await getDownloadURL(avatarRef);
            console.log("Google sign-in: uploaded provider photo for", uid, avatarUrl);
          } catch (err) {
            console.warn("Failed to upload provider photo, falling back to provider URL", err);
            avatarUrl = u.photoURL;
          }
        }

        // Create a minimal profile record; mark it as needing completion so the app can prompt the user.
        await setDoc(profileRef, {
          email: u.email || null,
          avatarUrl: avatarUrl || null,
          stance: null,
          createdAt: new Date().toISOString(),
          needsComplete: true,
        });
        console.log("Google sign-in: created profile meta for", uid);
      }
    } catch (e) {
      console.error(e);
      setError("Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      console.error(e);
      setError("Sign-in failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Upload avatar if provided
      let avatarUrl = null;
      if (avatarFile) {
        const avatarRef = storageRef(storage, `artifacts/${appId}/users/${uid}/avatar_${Date.now()}`);
        await uploadBytes(avatarRef, avatarFile);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      // Save profile data
      const profileData = {
        email,
        stance,
        avatarUrl: avatarUrl || null,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "artifacts", appId, "users", uid, "profile", "meta"), profileData);

      // Add initial boards
      for (const name of boards) {
        if (name && name.trim()) {
          const ref = await addDoc(collection(db, "artifacts", appId, "users", uid, "surfboards"), {
            name: name.trim(),
          });
          console.log("Sign-up: created surfboard", { id: ref.id, name: name.trim(), uid });
        }
      }

      // Add initial locations
      for (const name of locations) {
        if (name && name.trim()) {
          const ref = await addDoc(collection(db, "artifacts", appId, "users", uid, "locations"), {
            name: name.trim(),
          });
          console.log("Sign-up: created location", { id: ref.id, name: name.trim(), uid });
        }
      }

      // After sign-up the auth listener in App.jsx will take over and route the user into the app
      setIsSigningUp(false);
    } catch (e) {
      console.error(e);
      setError("Sign-up failed. Try a different email or a stronger password.");
    } finally {
      setLoading(false);
    }
  };

  // Helper utilities for sign-up UI
  const handleAvatarChange = (e) => {
    setAvatarFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
  };

  const addBoard = () => {
    if (boardInput && boardInput.trim()) {
      setBoards((s) => [...s, boardInput.trim()]);
      setBoardInput("");
    }
  };

  const removeBoard = (idx) => {
    setBoards((s) => s.filter((_, i) => i !== idx));
  };

  const addLocation = () => {
    if (locationInput && locationInput.trim()) {
      setLocations((s) => [...s, locationInput.trim()]);
      setLocationInput("");
    }
  };

  const removeLocation = (idx) => {
    setLocations((s) => s.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-1">
          Solf
        </h1>
                <h1 className="text-l font-bold text-center text-grey-700 mb-4">
          The Surfers Scorecard
        </h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-2 rounded mb-4">{error}</div>
        )}

        <div className="space-y-3 mb-4">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-red-500 text-white py-2 rounded font-semibold hover:bg-red-600"
          >
            Continue with Google
          </button>

        </div>

        {!isSigningUp ? (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
              >
                Sign in
              </button>
              <button
                onClick={() => setIsSigningUp(true)}
                type="button"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700"
              >
                Sign up
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stance</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="stance"
                    value="regular"
                    checked={stance === "regular"}
                    onChange={() => setStance("regular")}
                  />
                  Regular
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="stance"
                    value="goofy"
                    checked={stance === "goofy"}
                    onChange={() => setStance("goofy")}
                  />
                  Goofy
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo (optional)</label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
              {avatarFile && <p className="text-sm text-gray-500 mt-1">{avatarFile.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Boards (optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g., 7' Funboard"
                  value={boardInput}
                  onChange={(e) => setBoardInput(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded"
                />
                <button type="button" onClick={addBoard} className="bg-gray-700 text-white px-3 rounded">
                  Add
                </button>
              </div>
              <ul className="space-y-1">
                {boards.map((b, i) => (
                  <li key={i} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <span>{b}</span>
                    <button type="button" onClick={() => removeBoard(i)} className="text-red-500">Remove</button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surf Locations (optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g., Pipeline"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded"
                />
                <button type="button" onClick={addLocation} className="bg-gray-700 text-white px-3 rounded">
                  Add
                </button>
              </div>
              <ul className="space-y-1">
                {locations.map((l, i) => (
                  <li key={i} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <span>{l}</span>
                    <button type="button" onClick={() => removeLocation(i)} className="text-red-500">Remove</button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setIsSigningUp(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
