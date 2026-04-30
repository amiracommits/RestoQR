// app/sa/layout.tsx  ← OJO: debe estar en /sa/ no en /sa/dashboard/
export default function SALayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-neutral-100">
      {children}
    </div>
  )
}