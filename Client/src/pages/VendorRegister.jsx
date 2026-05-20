import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Search, Tags } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { getCategories } from '../services/api';
import {
  buildCategoryRequestOptions,
  buildRootCategoryGroups,
  normalizeCategoryId,
} from '../utils/vendorCategoryRequests';
import { getCategoryIcon, getCategoryTheme } from '../utils/categoryVisuals';

const levelLabel = (depth) => {
  if (depth === 0) return 'Main group';
  if (depth === 1) return 'Section';
  return 'Subcategory';
};

const categoryCommissionLabel = (category) => {
  const rate = category?.effectiveCommissionRate ?? category?.commissionRate ?? category?.minimumCommissionRate ?? 0;
  return Number(rate) > 0 ? `${rate}% commission` : 'Standard commission';
};

const VendorRegister = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeRootId, setActiveRootId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Address data
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [unions, setUnions] = useState([]);

  const [formData, setFormData] = useState({
    shopName: '',
    phone: '',
    address: {
      divisionId: '',
      districtId: '',
      upazilaId: '',
      unionId: '',
      details: '',
    },
    allowedCategoryIds: [],
  });

  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredUpazilas, setFilteredUpazilas] = useState([]);
  const [filteredUnions, setFilteredUnions] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchAddressData();
  }, []);

  const categoryOptions = useMemo(
    () => buildCategoryRequestOptions(categories),
    [categories],
  );

  const categoryGroups = useMemo(() => {
    const rootGroups = buildRootCategoryGroups(categoryOptions);
    return rootGroups
      .map((group) => ({
        ...group,
        root: categoryOptions.find((category) => category.id === group.id),
      }))
      .sort(
        (a, b) =>
          (a.root?.displayOrder || 999) - (b.root?.displayOrder || 999) ||
          a.name.localeCompare(b.name),
      );
  }, [categoryOptions]);

  useEffect(() => {
    if (categoryGroups.length === 0) {
      setActiveRootId('');
      return;
    }

    if (!activeRootId || !categoryGroups.some((group) => group.id === activeRootId)) {
      setActiveRootId(categoryGroups[0].id);
    }
  }, [activeRootId, categoryGroups]);

  const selectedCategoryIds = useMemo(
    () => new Set(formData.allowedCategoryIds.map(normalizeCategoryId)),
    [formData.allowedCategoryIds],
  );

  const selectedCategories = useMemo(
    () => categoryOptions.filter((category) => selectedCategoryIds.has(category.id)),
    [categoryOptions, selectedCategoryIds],
  );

  const activeGroup = categoryGroups.find((group) => group.id === activeRootId);
  const activeRoot = activeGroup?.root || categoryOptions.find((category) => category.id === activeRootId);

  const visibleCategoryOptions = useMemo(() => {
    if (!activeGroup) return [];
    const query = categorySearch.trim().toLowerCase();

    return activeGroup.options
      .filter((category) => category.id !== activeGroup.id)
      .filter((category) => {
        if (!query) return true;
        return (
          category.name.toLowerCase().includes(query) ||
          category.slug?.toLowerCase().includes(query) ||
          category.pathLabel.toLowerCase().includes(query)
        );
      });
  }, [activeGroup, categorySearch]);

  const hasSelectedAncestor = (category) =>
    category.path
      .slice(0, -1)
      .some((item) => selectedCategoryIds.has(normalizeCategoryId(item._id)));

  const getSelectedCountForGroup = (group) =>
    group.options.filter((category) => selectedCategoryIds.has(category.id)).length;

  const fetchAddressData = async () => {
    try {
      const [divisionsRes, districtsRes, upazilasRes, unionsRes] = await Promise.all([
        fetch('/divisions.json'),
        fetch('/districts.json'),
        fetch('/upazilas.json'),
        fetch('/unions.json'),
      ]);

      const [divisionsData, districtsData, upazilasData, unionsData] = await Promise.all([
        divisionsRes.json(),
        districtsRes.json(),
        upazilasRes.json(),
        unionsRes.json(),
      ]);

      // Extract data from PHPMyAdmin export format
      const extractData = (jsonArray) => {
        const dataObj = jsonArray.find(item => item.type === 'table');
        return dataObj ? dataObj.data : [];
      };

      setDivisions(extractData(divisionsData));
      setDistricts(extractData(districtsData));
      setUpazilas(extractData(upazilasData));
      setUnions(extractData(unionsData));
    } catch (error) {
      console.error('Error fetching address data:', error);
      setError('Failed to load address data');
    }
  };

  const fetchCategories = async () => {
    try {
      // Use shared API client so base URL is always correct
      const response = await getCategories();
      const allCategories = response.data?.data || [];
      // Only show active categories for vendor selection
      const activeCategories = allCategories.filter((cat) => cat.isActive !== false);
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleDivisionChange = (e) => {
    const divisionId = e.target.value;
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        divisionId,
        districtId: '',
        upazilaId: '',
        unionId: '',
      },
    });
    setFilteredDistricts(districts.filter(d => d.division_id === divisionId));
    setFilteredUpazilas([]);
    setFilteredUnions([]);
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        districtId,
        upazilaId: '',
        unionId: '',
      },
    });
    setFilteredUpazilas(upazilas.filter(u => u.district_id === districtId));
    setFilteredUnions([]);
  };

  const handleUpazilaChange = (e) => {
    const upazilaId = e.target.value;
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        upazilaId,
        unionId: '',
      },
    });
    setFilteredUnions(unions.filter(u => u.upazilla_id === upazilaId));
  };

  const handleCategoryToggle = (category) => {
    const categoryId = normalizeCategoryId(category?._id || category?.id);
    if (!categoryId) return;

    const descendantIds = categoryOptions
      .filter(
        (option) =>
          option.id !== categoryId &&
          option.path.some((pathItem) => normalizeCategoryId(pathItem._id) === categoryId),
      )
      .map((option) => option.id);

    const ancestorIds = (category.path || [])
      .slice(0, -1)
      .map((pathItem) => normalizeCategoryId(pathItem._id))
      .filter(Boolean);

    setFormData((current) => {
      const currentIds = current.allowedCategoryIds.map(normalizeCategoryId);
      const alreadySelected = currentIds.includes(categoryId);
      const nextIds = alreadySelected
        ? currentIds.filter((id) => id !== categoryId)
        : [
            ...currentIds.filter(
              (id) => !descendantIds.includes(id) && !ancestorIds.includes(id),
            ),
            categoryId,
          ];

      return {
        ...current,
        allowedCategoryIds: [...new Set(nextIds)],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.allowedCategoryIds.length === 0) {
      setError('Please select at least one category');
      return;
    }

    if (!formData.address.divisionId || !formData.address.districtId || !formData.address.upazilaId) {
      setError('Please complete the address information');
      return;
    }

    setLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Vendor registration submitted successfully! Pending admin approval.');
        setTimeout(() => {
          navigate('/vendor/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error registering vendor:', error);
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Become a Vendor</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Name *
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your shop name"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="01XXXXXXXXX"
              />
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Shop Address</h3>
              
              {/* Division */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Division *
                </label>
                <select
                  required
                  value={formData.address.divisionId}
                  onChange={handleDivisionChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Division</option>
                  {divisions.map(div => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District *
                </label>
                <select
                  required
                  value={formData.address.districtId}
                  onChange={handleDistrictChange}
                  disabled={!formData.address.divisionId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select District</option>
                  {filteredDistricts.map(dist => (
                    <option key={dist.id} value={dist.id}>{dist.name}</option>
                  ))}
                </select>
              </div>

              {/* Upazila */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upazila *
                </label>
                <select
                  required
                  value={formData.address.upazilaId}
                  onChange={handleUpazilaChange}
                  disabled={!formData.address.districtId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select Upazila</option>
                  {filteredUpazilas.map(upz => (
                    <option key={upz.id} value={upz.id}>{upz.name}</option>
                  ))}
                </select>
              </div>

              {/* Union */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Union (Optional)
                </label>
                <select
                  value={formData.address.unionId}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, unionId: e.target.value }
                  })}
                  disabled={!formData.address.upazilaId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select Union</option>
                  {filteredUnions.map(union => (
                    <option key={union.id} value={union.id}>{union.name}</option>
                  ))}
                </select>
              </div>

              {/* Address Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Address
                </label>
                <textarea
                  value={formData.address.details}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, details: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="House/Building number, Road, Area"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F57224]/10 text-[#F57224]">
                    <Tags className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-950">
                      Select Categories You Will Sell In *
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Pick a main group for full access, or choose exact sections and subcategories.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                  {selectedCategories.length} selected
                </div>
              </div>

              {categories.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  Categories are loading or not available. Please refresh and try again.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                    <div className="mb-2 px-2 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Main category groups
                    </div>
                    <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                      {categoryGroups.map((group, index) => {
                        const root = group.root || group;
                        const CategoryIcon = getCategoryIcon(root);
                        const selectedCount = getSelectedCountForGroup(group);
                        const isActive = activeRootId === group.id;

                        return (
                          <button
                            type="button"
                            key={group.id}
                            onClick={() => {
                              setActiveRootId(group.id);
                              setCategorySearch('');
                            }}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                              isActive
                                ? 'border-[#F57224]/50 bg-white shadow-sm ring-2 ring-[#F57224]/10'
                                : 'border-transparent bg-transparent hover:border-gray-200 hover:bg-white'
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${getCategoryTheme(root, index)}`}
                            >
                              <CategoryIcon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-gray-950">
                                {group.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-gray-500">
                                {group.subcategoryCount} options
                              </span>
                            </span>
                            {selectedCount > 0 && (
                              <span className="rounded-full bg-[#F57224] px-2 py-0.5 text-xs font-bold text-white">
                                {selectedCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#F57224]">
                            Active group
                          </p>
                          <h4 className="mt-1 text-xl font-black text-gray-950">
                            {activeGroup?.name || 'Select a group'}
                          </h4>
                        </div>
                        <div className="relative md:w-72">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="search"
                            value={categorySearch}
                            onChange={(event) => setCategorySearch(event.target.value)}
                            placeholder="Search inside this group"
                            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#F57224] focus:ring-2 focus:ring-[#F57224]/20"
                          />
                        </div>
                      </div>

                      {activeRoot && (
                        <button
                          type="button"
                          onClick={() => handleCategoryToggle(activeRoot)}
                          className={`mt-4 flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                            selectedCategoryIds.has(activeRoot.id)
                              ? 'border-[#F57224]/50 bg-[#F57224]/10'
                              : 'border-gray-200 bg-gray-50 hover:border-[#F57224]/40 hover:bg-[#F57224]/5'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selectedCategoryIds.has(activeRoot.id)
                                ? 'border-[#F57224] bg-[#F57224] text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {selectedCategoryIds.has(activeRoot.id) && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="font-bold text-gray-950">
                              Select full {activeRoot.name} group
                            </span>
                            <span className="mt-1 block text-sm text-gray-600">
                              Vendor can list products under every section and subcategory in this group.
                            </span>
                          </span>
                          <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 ring-1 ring-gray-200 sm:inline-flex">
                            {categoryCommissionLabel(activeRoot)}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-[430px] overflow-y-auto p-4">
                      {visibleCategoryOptions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm font-semibold text-gray-500">
                          No categories match your search in this group.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visibleCategoryOptions.map((category) => {
                            const isSelected = selectedCategoryIds.has(category.id);
                            const coveredByGroup = !isSelected && hasSelectedAncestor(category);

                            return (
                              <button
                                type="button"
                                key={category.id}
                                onClick={() => handleCategoryToggle(category)}
                                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                                  isSelected
                                    ? 'border-[#F57224]/50 bg-[#F57224]/10'
                                    : coveredByGroup
                                      ? 'border-emerald-200 bg-emerald-50'
                                      : 'border-gray-200 bg-white hover:border-[#F57224]/40 hover:bg-[#F57224]/5'
                                }`}
                              >
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    isSelected || coveredByGroup
                                      ? 'border-[#F57224] bg-[#F57224] text-white'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  {(isSelected || coveredByGroup) && <Check className="h-3.5 w-3.5" />}
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-gray-950">
                                      {category.name}
                                    </span>
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                                      {levelLabel(category.depth)}
                                    </span>
                                    {coveredByGroup && (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                        Covered by selected group
                                      </span>
                                    )}
                                  </span>
                                  <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                                    {category.path.map((item, index) => (
                                      <span key={item._id} className="inline-flex items-center gap-1">
                                        {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                                        {item.name}
                                      </span>
                                    ))}
                                  </span>
                                </span>

                                <span className="hidden shrink-0 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 sm:inline-flex">
                                  {categoryCommissionLabel(category)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedCategories.length > 0 && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-bold text-gray-950">
                    Selected access
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((category) => (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => handleCategoryToggle(category)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#F57224]/30 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 transition hover:bg-[#F57224]/10"
                        title="Remove category"
                      >
                        {category.name}
                        <span className="text-[#F57224]">x</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Register as Vendor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
