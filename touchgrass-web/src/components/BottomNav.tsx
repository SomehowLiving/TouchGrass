"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users2, Plus, MessageCircle, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { id: 1, link: "/", icon: Home, label: "Home" },
    { id: 2, link: "/clique", icon: Users2, label: "Cliques" },
    { id: 3, link: "/plan", icon: Plus, label: "Plan" },
    { id: 4, link: "/chat", icon: MessageCircle, label: "Chat" },
    { id: 5, link: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-4 left-0 w-full px-6 z-50">
      <ul className="flex justify-around items-center bg-black/40 backdrop-blur-md py-2 rounded-full shadow-lg">
        {links.map(({ id, link, icon: Icon, label }) => (
          <li key={id}>
            <Link href={link} aria-label={label}>
              <button
                className={`p-3 rounded-full text-white transition ${
                  pathname === link
                    ? "bg-green-600 shadow-lg"
                    : "bg-green-700 hover:bg-green-600"
                }`}
              >
                <Icon size={20} />
              </button>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
