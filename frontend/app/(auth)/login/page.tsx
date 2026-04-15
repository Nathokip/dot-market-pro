"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
    });
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-[#121833] p-6 rounded-xl w-96">
        <h2 className="text-xl mb-4">Login</h2>

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
          onClick={login}
          className="bg-cyan-400 text-black w-full p-2"
        >
          Login
        </button>
      </div>
    </div>
  );
}