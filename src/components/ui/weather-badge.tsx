import { getWeatherIcon } from "@/lib/weather";

interface WeatherBadgeProps {
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  variant?: "compact" | "expanded";
}

export function WeatherBadge({
  temperatureMax,
  temperatureMin,
  weatherCode,
  variant = "compact",
}: WeatherBadgeProps) {
  const Icon = getWeatherIcon(weatherCode);
  const max = Math.round(temperatureMax);
  const min = Math.round(temperatureMin);

  if (variant === "compact") {
    return (
      <div className="text-[10px] text-gray-400 mt-auto pt-1 leading-none flex items-center gap-1">
        <Icon className="w-3 h-3 shrink-0" />
        {max}°/{min}°
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-400 flex items-center gap-1">
      <Icon className="w-4 h-4 shrink-0" />
      <span>{max}° / {min}°</span>
    </div>
  );
}
