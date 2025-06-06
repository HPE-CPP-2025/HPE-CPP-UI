'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DeviceService } from '../../lib/api/devices';

interface Device {
  deviceId: number;
  deviceName: string;
  deviceType: string;
  powerRating: string;
  location: string;
  houseId: number;
  userId: number;
}

// Helper functions to avoid code duplication
const getCleanToken = (): string | null => {
  const jwtToken = localStorage.getItem('jwt');
  if (!jwtToken) return null;
  return jwtToken.replace(/^"|"$/g, '').trim();
};

const getParsedUserInfo = (): any | null => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  
  try {
    let parsedUser = userData;
    if (userData.startsWith('"') && userData.endsWith('"')) {
      parsedUser = userData.slice(1, -1);
    }
    parsedUser = parsedUser.replace(/\\"/g, '"');
    return JSON.parse(parsedUser);
  } catch (err) {
    console.error('Error parsing user info:', err);
    return null;
  }
};

export default function UpdateDevicePage() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState({
    fetch: false,
    update: false
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    userId: number;
    houseId: number;
    role: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get token and user info from localStorage
    const cleanToken = getCleanToken();
    const parsedUserInfo = getParsedUserInfo();

    if (cleanToken) {
      setToken(cleanToken);
    }

    if (parsedUserInfo) {
      setUserInfo(parsedUserInfo);
    } else {
      router.push('/signin');
    }
  }, [router]);

  const fetchDevice = async () => {
    if (!deviceId) {
      setError('Please enter a device ID');
      return;
    }

    setLoading({ ...loading, fetch: true });
    setError(null);
    setDevice(null);

    try {
      const cleanToken = getCleanToken();
      const parsedUserInfo = getParsedUserInfo();
      
      if (!cleanToken || !parsedUserInfo) {
        throw new Error('Session expired. Please login again.');
      }

      // Use DeviceService to fetch device details
      const deviceData = await DeviceService.getDeviceDetails(parseInt(deviceId), cleanToken);
      setDevice(deviceData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading({ ...loading, fetch: false });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device || !userInfo) return;

    setLoading({ ...loading, update: true });
    setError(null);
    setSuccess(null);

    try {
      const cleanToken = getCleanToken();
      const parsedUserInfo = getParsedUserInfo();

      if (!cleanToken || !parsedUserInfo) {
        throw new Error('Session expired. Please login again.');
      }

      if (parsedUserInfo.role !== 'ROLE_HOUSE_OWNER') {
        throw new Error('Only house owners can update devices');
      }

      // Prepare update data with houseId included
      const updateData = {
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        powerRating: device.powerRating,
        location: device.location,
        houseId: userInfo.houseId
      };

      console.log('Update data being sent:', updateData);
      console.log('Token being used:', cleanToken.substring(0, 20) + '...');

      // Use DeviceService to update the device
      await DeviceService.updateDevice(device.deviceId, updateData, cleanToken);

      setSuccess('Device updated successfully!');
      setTimeout(() => router.push('/device-dashboard'), 2000);
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message);
    } finally {
      setLoading({ ...loading, update: false });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!device) return;
    const { name, value } = e.target;
    setDevice({ ...device, [name]: value });
  };

  // Show loading or redirect if not authenticated
  useEffect(() => {
    // Only run this effect after the first render (client-side)
    if (typeof window !== 'undefined') {
      const cleanToken = getCleanToken();
      const parsedUserInfo = getParsedUserInfo();
      if (!cleanToken || !parsedUserInfo) {
        router.replace('/signin');
      }
    }
  }, [router]);

  // Only render after client-side check
  if (typeof window !== 'undefined' && (token === null || userInfo === null)) {
    return null;
  }

  // Now it's safe to check the role
  if (userInfo && userInfo.role !== 'ROLE_HOUSE_OWNER') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <main className="flex-grow container mx-auto px-6 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">Only house owners can update devices</p>
            </div>
            <button 
              onClick={() => router.push('/device-dashboard')}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex-grow container mx-auto px-6 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold" style={{ color: '#008080' }}>Update Device</h1>
            <button 
              onClick={() => router.push('/device-dashboard')}
              className="px-4 py-2 text-teal-600 hover:text-teal-800"
            >
              ← Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Device ID to Update*
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="deviceId"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="Enter device ID (e.g., 16)"
                />
                <button
                  onClick={fetchDevice}
                  disabled={loading.fetch || !deviceId}
                  className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400"
                >
                  {loading.fetch ? 'Loading...' : 'Find Device'}
                </button>
              </div>
            </div>

            {device && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device ID
                  </label>
                  <div className="px-3 py-2 bg-gray-100 text-black rounded-md">
                    {device.deviceId}
                  </div>
                </div>

                <div>
                  <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Name*
                  </label>
                  <input
                    type="text"
                    id="deviceName"
                    name="deviceName"
                    value={device.deviceName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Type*
                  </label>
                  <select
                    id="deviceType"
                    name="deviceType"
                    value={device.deviceType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                  >
                    <option value="Appliance">Appliance</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Electronics">Electronics</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="powerRating" className="block text-sm font-medium text-gray-700 mb-1">
                    Power Rating*
                  </label>
                  <input
                    type="text"
                    id="powerRating"
                    name="powerRating"
                    value={device.powerRating}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                    placeholder="200W"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location*
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={device.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    required
                    placeholder="Kitchen"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading.update}
                    className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    {loading.update ? 'Updating...' : 'Update Device'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}