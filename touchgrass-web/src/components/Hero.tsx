"use client";

import { MapPin, Gamepad2 } from "lucide-react";
import { useTypewriter } from "react-simple-typewriter";
import { FaPersonSwimming } from "react-icons/fa6";

export default function Hero() {
  const [typeEffect] = useTypewriter({
    words: ["Gaming", "Swimming"],
    loop: 0,
    typeSpeed: 100,
    deleteSpeed: 40,
  });

  return (
    <section className="text-center text-white mt-12 space-y-8 w-full max-w-xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold">
          Touch <span className="text-green-500">Grass</span>
        </h1>
        <p className="mt-2 text-lg">
          Enough screen time. Let’s log out together!
        </p>
      </div>

      <div className=" bg-opacity-10 border border-white border-opacity-30 rounded-lg p-6 space-y-6">
        {/* Location Dropdown */}
        <div className="flex items-center gap-2 bg-transparent border border-white rounded px-4 py-2">
          <MapPin className="text-white" size={20} />
          <select
            className="bg-transparent outline-none text-white w-full"
            defaultValue=""
          >
            <option value="" disabled>
              Location
            </option>
            <option value="lagos">Lagos</option>
            <option value="abuja">Abuja</option>
            <option value="accra">Accra</option>
            <option value="remote">Remote Meetup</option>
          </select>
        </div>

        {/* Activity Prompt */}
        <div className="flex items-center gap-2 justify-center bg-white text-black rounded-2xl px-6 py-3 text-lg">
          {typeEffect.charAt(0) === "G" ? <Gamepad2 /> : <FaPersonSwimming />}
          <span>{typeEffect}?</span>
        </div>
      </div>
    </section>
  );
}
