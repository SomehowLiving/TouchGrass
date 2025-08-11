"use client";

export default function Spinner() {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
