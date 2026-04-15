"use client";
import axios from "axios";
import { useState } from "react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    await axios.post("/api/register", { email, password });
    alert("User created!");
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-[#121833] p-6 rounded-xl w-96">
        <h2 className="text-xl mb-4">Register</h2>

        <input
          className="w-full mb-3 p-2 bg-black"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full mb-3 p-2 bg-black"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={register}
          className="bg-cyan-400 text-black w-full p-2"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}