interface CountUpNumberProps {
  end: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export default function CountUpNumber({ end, duration = 2000, suffix = "", className = "" }: CountUpNumberProps) {
  void duration;
  return <span className={className}>{end}{suffix}</span>;
}
