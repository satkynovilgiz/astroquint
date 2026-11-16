/** Gentle rising sparkles behind a victory/results header. CSS-only; frozen under reduced motion. */
export function Celebration({ count = 16 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${(i * 37 + 7) % 100}%`,
            width: i % 3 === 0 ? 8 : 5,
            height: i % 3 === 0 ? 8 : 5,
            background: ["#B9F46D", "#F5C451", "#BFA8FF", "#FFB681", "#5FE3D3"][i % 5],
            boxShadow: `0 0 10px ${["#B9F46D", "#F5C451", "#BFA8FF", "#FFB681", "#5FE3D3"][i % 5]}`,
            animation: `rise-fade ${2.2 + (i % 5) * 0.45}s ease-out ${0.2 + (i % 7) * 0.3}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
