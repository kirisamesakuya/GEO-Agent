export default function PlatformLogo() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--platform-primary)] text-white shadow-[0_10px_24px_rgba(31,111,255,0.24)]">
      <div className="relative h-6 w-6">
        <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-md bg-white" />
        <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-md bg-white opacity-90" />
        <span className="absolute bottom-0 left-1 h-3.5 w-3.5 rounded-md bg-white opacity-95" />
      </div>
    </div>
  );
}
