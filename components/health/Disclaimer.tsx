export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[12px] leading-relaxed text-muted ${className}`}>
      SGPetCare is a record keeping tool, not veterinary advice. Always consult a licensed veterinarian for your pet&apos;s health concerns.
    </p>
  )
}
