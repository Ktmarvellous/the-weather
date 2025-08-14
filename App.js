import React, { useState, useEffect } from "react";

const API_KEY = "89572d41dff06e97e5525b2b6120db58";

// Fetch coordinates by city name
async function fetchCoords(city) {
  const res = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("City not found");
  const data = await res.json();
  if (!data.length) throw new Error("City not found");
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].name };
}

// Fetch current weather
async function fetchWeather(lat, lon, unit) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("Failed to fetch current weather");
  return await res.json();
}

// Fetch 5-day forecast
async function fetchForecast(lat, lon, unit) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return await res.json();
}

// Weather icon component
const WeatherIcon = ({ icon, alt }) => (
  <img
    src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
    alt={alt}
    style={{ width: 50, height: 50 }}
  />
);

// Daily forecast component (grouped by date)
const DailyForecast = ({ forecast, unit }) => {
  // Group forecast items by day
  const days = {};
  forecast.list.forEach((item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString();
    if (!days[date]) days[date] = [];
    days[date].push(item);
  });

  return (
    <div>
      <h3>5-Day Forecast</h3>
      {Object.keys(days).map((date, i) => {
        const dayItems = days[date];
        const temps = dayItems.map((item) => item.main.temp);
        const minTemp = Math.min(...temps).toFixed(1);
        const maxTemp = Math.max(...temps).toFixed(1);
        const icon = dayItems[0].weather[0].icon;
        const description = dayItems[0].weather[0].description;

        return (
          <div
            key={i}
            style={{
              borderBottom: "1px solid #ccc",
              padding: "8px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong>
              <br />
              {description}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <WeatherIcon icon={icon} alt={description} />
              <span>
                Min: {minTemp}°, Max: {maxTemp}° {unit === "metric" ? "C" : "F"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Hourly forecast component (next 24 hours)
const HourlyForecast = ({ forecast, unit }) => {
  const next24 = forecast.list.slice(0, 8); // 3-hour intervals → 8 items ≈ 24h
  return (
    <div>
      <h3>24-Hour Forecast</h3>
      {next24.map((item, i) => (
        <div
          key={i}
          style={{
            borderBottom: "1px solid #ccc",
            padding: "8px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>
              {new Date(item.dt * 1000).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
            <br />
            {item.weather[0].description}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <WeatherIcon icon={item.weather[0].icon} alt={item.weather[0].description} />
            <span>{item.main.temp}° {unit === "metric" ? "C" : "F"}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function WeatherApp() {
  const [coords, setCoords] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("daily");
  const [unit, setUnit] = useState("metric");
  const [cityInput, setCityInput] = useState("");
  const [savedLocations, setSavedLocations] = useState(() => {
    const saved = localStorage.getItem("savedLocations");
    return saved ? JSON.parse(saved) : [];
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Persist saved locations & theme
  useEffect(() => localStorage.setItem("savedLocations", JSON.stringify(savedLocations)), [savedLocations]);
  useEffect(() => localStorage.setItem("theme", theme), [theme]);

  // Get user location
  useEffect(() => {
    if (!coords && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Current Location" }),
        () => setError("Location permission denied")
      );
    }
  }, [coords]);

  // Fetch weather + forecast when coords or unit changes
  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetchWeather(coords.lat, coords.lon, unit),
      fetchForecast(coords.lat, coords.lon, unit)
    ])
      .then(([weather, forecast]) => {
        setWeatherData(weather);
        setForecastData(forecast);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setWeatherData(null);
        setForecastData(null);
        setLoading(false);
      });
  }, [coords, unit]);

  const handleSearch = async () => {
    if (!cityInput) return setError("Please enter a city name");
    setLoading(true);
    setError("");
    try {
      const newCoords = await fetchCoords(cityInput);
      setCoords(newCoords);
      setCityInput("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentLocation = () => {
    if (!coords) return;
    if (savedLocations.some((loc) => loc.lat === coords.lat && loc.lon === coords.lon)) {
      setMessage("Location already saved");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setSavedLocations([...savedLocations, coords]);
    setMessage("Location saved!");
    setTimeout(() => setMessage(""), 3000);
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const loadLocation = (loc) => setCoords(loc);

  const containerStyle = {
    backgroundColor: theme === "dark" ? "#222" : "#f9f9f9",
    color: theme === "dark" ? "#eee" : "#222",
    minHeight: "100vh",
    padding: 20,
    fontFamily: "Arial",
  };

  return (
    <div style={containerStyle}>
      <h1>Weather App</h1>

      <div style={{ marginBottom: 10 }}>
        <input
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="Search city"
          style={{ padding: 8, fontSize: 16, width: "60%" }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} style={{ padding: 8, marginLeft: 10 }}>Search</button>
        <button onClick={saveCurrentLocation} style={{ padding: 8, marginLeft: 10 }} disabled={!coords}>Save Location</button>
      </div>

      {message && <div style={{ color: "green", marginBottom: 10 }}>{message}</div>}

      <div style={{ marginBottom: 20 }}>
        <label>
          <input type="radio" checked={view === "daily"} onChange={() => setView("daily")} /> Daily
        </label>
        <label style={{ marginLeft: 10 }}>
          <input type="radio" checked={view === "hourly"} onChange={() => setView("hourly")} /> Hourly
        </label>
        <button onClick={() => setUnit(unit === "metric" ? "imperial" : "metric")} style={{ marginLeft: 20, padding: 6 }}>
          °C / °F
        </button>
        <button onClick={toggleTheme} style={{ marginLeft: 20, padding: 6 }}>Theme: {theme}</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <strong>Saved Locations:</strong>{" "}
        {savedLocations.length === 0 && <span>None</span>}
        {savedLocations.map((loc, i) => (
          <button key={i} onClick={() => loadLocation(loc)} style={{ marginLeft: 5, padding: "5px 10px" }}>
            {loc.name || `Location ${i + 1}`}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "red", marginBottom: 10 }}><strong>Error:</strong> {error}</div>}
      {loading && <div>Loading weather data...</div>}

      {weatherData && forecastData && !loading && (
        <>
          <h2>Weather for: {coords.name} ({unit === "metric" ? "°C" : "°F"})</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <WeatherIcon icon={weatherData.weather[0].icon} alt={weatherData.weather[0].description} />
            <div>
              <p><strong>Current:</strong> {weatherData.main.temp}°, {weatherData.weather[0].description}</p>
              <p>Humidity: {weatherData.main.humidity}%</p>
              <p>Wind Speed: {weatherData.wind.speed} {unit === "metric" ? "m/s" : "mph"}</p>
            </div>
          </div>

          {view === "daily" && <DailyForecast forecast={forecastData} unit={unit} />}
          {view === "hourly" && <HourlyForecast forecast={forecastData} unit={unit} />}
        </>
      )}

      {!weatherData && !forecastData && !loading && <div>No weather data available.</div>}
    </div>
  );
}


