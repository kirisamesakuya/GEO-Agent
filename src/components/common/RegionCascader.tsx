import { useEffect, useMemo, useState } from 'react';
import {
  formatRegionValue,
  listCities,
  listDistricts,
  resolveCityAfterProvince,
  resolveRegionPartsFromLegacy,
  CHINA_REGION_TREE,
} from '../../lib/china-region';

interface RegionCascaderProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function RegionCascader({ value, onChange, className = '' }: RegionCascaderProps) {
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    const [p, c, d] = resolveRegionPartsFromLegacy(value);
    setProvince(p);
    setCity(c ? resolveCityAfterProvince(p, c) : resolveCityAfterProvince(p));
    setDistrict(d);
  }, [value]);

  const cities = useMemo(() => listCities(province), [province]);
  const districts = useMemo(() => listDistricts(province, city), [province, city]);

  const emit = (p: string, c: string, d: string) => {
    onChange(formatRegionValue([p, c, d]));
  };

  const onProvinceChange = (nextProvince: string) => {
    const nextCity = resolveCityAfterProvince(nextProvince);
    setProvince(nextProvince);
    setCity(nextCity);
    setDistrict('');
    emit(nextProvince, nextCity, '');
  };

  const onCityChange = (nextCity: string) => {
    setCity(nextCity);
    setDistrict('');
    emit(province, nextCity, '');
  };

  const onDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    emit(province, city, nextDistrict);
  };

  const showCitySelect = cities.length > 0 && !(cities.length === 1 && cities[0].label === '市辖区');

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 ${className}`}>
      <select
        className="geo-input text-sm"
        value={province}
        onChange={(e) => onProvinceChange(e.target.value)}
        aria-label="省"
      >
        <option value="">请选择省</option>
        {CHINA_REGION_TREE.map((p) => (
          <option key={p.value} value={p.label}>
            {p.label}
          </option>
        ))}
      </select>

      {showCitySelect ? (
        <select
          className="geo-input text-sm"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          disabled={!province}
          aria-label="市"
        >
          <option value="">请选择市</option>
          {cities.map((c) => (
            <option key={c.value} value={c.label}>
              {c.label}
            </option>
          ))}
        </select>
      ) : (
        <select
          className="geo-input text-sm"
          value={city}
          disabled
          aria-label="市"
          title={province ? '当前省份按区级划分' : undefined}
        >
          <option value={city}>{city || '—'}</option>
        </select>
      )}

      <select
        className="geo-input text-sm"
        value={district}
        onChange={(e) => onDistrictChange(e.target.value)}
        disabled={!province || !city}
        aria-label="区"
      >
        <option value="">请选择区</option>
        {districts.map((d) => (
          <option key={d.value} value={d.label}>
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );
}
