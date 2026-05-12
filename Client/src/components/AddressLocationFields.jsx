import { useEffect, useMemo, useState } from "react";

const extractData = (payload, tableName) => {
  if (Array.isArray(payload)) {
    const table = payload.find((item) => item.type === "table" && (!tableName || item.name === tableName));
    if (table?.data) return table.data;
  }
  return Array.isArray(payload?.data) ? payload.data : [];
};

export default function AddressLocationFields({ value, onChange, className = "" }) {
  const [geoData, setGeoData] = useState({
    divisions: [],
    districts: [],
    upazilas: [],
    unions: [],
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      const [divisionsRes, districtsRes, upazilasRes, unionsRes] = await Promise.all([
        fetch("/divisions.json"),
        fetch("/districts.json"),
        fetch("/upazilas.json"),
        fetch("/unions.json"),
      ]);
      const [divisionsJson, districtsJson, upazilasJson, unionsJson] = await Promise.all([
        divisionsRes.json(),
        districtsRes.json(),
        upazilasRes.json(),
        unionsRes.json(),
      ]);

      if (!mounted) return;
      setGeoData({
        divisions: extractData(divisionsJson, "divisions"),
        districts: extractData(districtsJson, "districts"),
        upazilas: extractData(upazilasJson, "upazilas"),
        unions: extractData(unionsJson, "unions"),
      });
    };

    loadData().catch((error) => console.error("Failed to load address data:", error));
    return () => {
      mounted = false;
    };
  }, []);

  const districts = useMemo(
    () => geoData.districts.filter((district) => district.division_id === value.divisionId),
    [geoData.districts, value.divisionId],
  );
  const upazilas = useMemo(
    () => geoData.upazilas.filter((upazila) => upazila.district_id === value.districtId),
    [geoData.upazilas, value.districtId],
  );
  const unions = useMemo(
    () => geoData.unions.filter((union) => union.upazilla_id === value.upazilaId),
    [geoData.unions, value.upazilaId],
  );

  const pick = (items, id) => items.find((item) => item.id === id) || null;

  const updateLocation = (field, id) => {
    const next = { ...value };

    if (field === "division") {
      const division = pick(geoData.divisions, id);
      Object.assign(next, {
        divisionId: id,
        division: division?.name || "",
        districtId: "",
        district: "",
        upazilaId: "",
        upazila: "",
        unionId: "",
        union: "",
      });
    }

    if (field === "district") {
      const district = pick(geoData.districts, id);
      Object.assign(next, {
        districtId: id,
        district: district?.name || "",
        city: district?.name || "",
        upazilaId: "",
        upazila: "",
        unionId: "",
        union: "",
      });
    }

    if (field === "upazila") {
      const upazila = pick(geoData.upazilas, id);
      Object.assign(next, {
        upazilaId: id,
        upazila: upazila?.name || "",
        unionId: "",
        union: "",
      });
    }

    if (field === "union") {
      const union = pick(geoData.unions, id);
      Object.assign(next, {
        unionId: id,
        union: union?.name || "",
      });
    }

    onChange(next);
  };

  const selectClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <label className="block">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Division *</span>
        <select
          value={value.divisionId || ""}
          onChange={(event) => updateLocation("division", event.target.value)}
          required
          className={selectClass}
        >
          <option value="">Select Division</option>
          {geoData.divisions.map((division) => (
            <option key={division.id} value={division.id}>{division.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-gray-700 mb-2">District *</span>
        <select
          value={value.districtId || ""}
          onChange={(event) => updateLocation("district", event.target.value)}
          required
          disabled={!value.divisionId}
          className={selectClass}
        >
          <option value="">Select District</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>{district.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Upazila *</span>
        <select
          value={value.upazilaId || ""}
          onChange={(event) => updateLocation("upazila", event.target.value)}
          required
          disabled={!value.districtId}
          className={selectClass}
        >
          <option value="">Select Upazila</option>
          {upazilas.map((upazila) => (
            <option key={upazila.id} value={upazila.id}>{upazila.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-gray-700 mb-2">Union *</span>
        <select
          value={value.unionId || ""}
          onChange={(event) => updateLocation("union", event.target.value)}
          required
          disabled={!value.upazilaId}
          className={selectClass}
        >
          <option value="">Select Union</option>
          {unions.map((union) => (
            <option key={union.id} value={union.id}>{union.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
