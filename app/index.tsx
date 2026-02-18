import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'http://10.0.2.2:4000/api'; // Use 10.0.2.2 for Android emulator

const CATEGORIES = [
  { id: 'all', nameAr: 'الكل', nameEn: 'All' },
  { id: 'iftar', nameAr: 'الإفطار', nameEn: 'Iftar' },
  { id: 'suhoor', nameAr: 'السحور', nameEn: 'Suhoor' },
  { id: 'prayer', nameAr: 'الصلاة', nameEn: 'Prayer' },
  { id: 'morning', nameAr: 'أذكار الصباح', nameEn: 'Morning' },
  { id: 'evening', nameAr: 'أذكار المساء', nameEn: 'Evening' },
];

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState(null);
  const [prayer, setPrayer] = useState(null);
  const [duas, setDuas] = useState([]);
  const [fastingLog, setFastingLog] = useState(null);
  const [prayerLog, setPrayerLog] = useState(null);
  const [quranLog, setQuranLog] = useState(null);
  const [duaSearch, setDuaSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [iftarCountdown, setIftarCountdown] = useState('');
  const [showZakat, setShowZakat] = useState(false);
  const [wealth, setWealth] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (prayer?.iftarTime) {
      const interval = setInterval(updateCountdowns, 60000);
      updateCountdowns();
      return () => clearInterval(interval);
    }
  }, [prayer]);

  function updateCountdowns() {
    const now = new Date();
    if (prayer?.iftarTime) {
      const [iftarH, iftarM] = prayer.iftarTime.split(':').map(Number);
      const iftar = new Date();
      iftar.setHours(iftarH, iftarM, 0);
      if (iftar < now) iftar.setDate(iftar.getDate() + 1);
      const diff = iftar.getTime() - now.getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setIftarCountdown(`${hrs}h ${mins}m`);
    }
  }

  async function loadData() {
    try {
      const token = await AsyncStorage.getItem('nur_token') || 'dev-user';
      await AsyncStorage.setItem('nur_token', token);

      const [statsRes, duasRes, fastingRes, prayerLogRes, quranRes] = await Promise.all([
        axios.get(`${API_BASE}/stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/content/duas`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/logs/fasting`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/logs/prayer`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/logs/quran`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data);
      setDuas(duasRes.data || []);

      const fastingData = fastingRes.data || [];
      const prayerData = prayerLogRes.data || [];
      const quranData = quranRes.data || [];

      setFastingLog(fastingData.find((l: any) => l.date === today) || null);
      setPrayerLog(prayerData.find((l: any) => l.date === today) || null);
      setQuranLog(quranData.find((l: any) => l.date === today) || null);
    } catch (e) {
      console.log('Load error:', e);
    }
  }

  async function toggleFasting() {
    try {
      const token = await AsyncStorage.getItem('nur_token');
      await axios.post(`${API_BASE}/logs/fasting`, 
        { date: today, isFasting: !fastingLog?.isFasting },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to log fasting');
    }
  }

  async function togglePrayer(prayerName: string) {
    try {
      const token = await AsyncStorage.getItem('nur_token');
      const current = prayerLog?.[prayerName] || false;
      await axios.post(`${API_BASE}/logs/prayer`,
        { date: today, [prayerName]: !current },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to log prayer');
    }
  }

  async function updateQuran(pages: number) {
    try {
      const token = await AsyncStorage.getItem('nur_token');
      await axios.post(`${API_BASE}/logs/quran`,
        { date: today, pagesRead: pages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to update Quran');
    }
  }

  async function fetchPrayerTimes() {
    if (!lat || !lng) {
      setError(lang === 'ar' ? 'أدخل الموقع أولاً' : 'Enter location first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('nur_token');
      const res = await axios.get(`${API_BASE}/prayer/today?lat=${lat}&lng=${lng}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrayer(res.data);
    } catch (e) {
      setError(lang === 'ar' ? 'فشل في جلب المواقيت' : 'Failed to fetch times');
    }
    setLoading(false);
  }

  const filteredDuas = duas.filter((dua: any) => {
    const matchSearch = !duaSearch || dua.textAr?.includes(duaSearch) || dua.textEn?.includes(duaSearch);
    const matchCategory = selectedCategory === 'all' || dua.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const quranPages = quranLog?.pagesRead || 0;
  const nisab = 85 * 8500000;
  const wajib = wealth >= nisab;
  const amount = wajib ? wealth * 0.025 : 0;

  const tabs = [
    { id: 'home', icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'duas', icon: '🤲', label: lang === 'ar' ? 'الأدعية' : 'Duas' },
    { id: 'quran', icon: '📖', label: lang === 'ar' ? 'القرآن' : 'Quran' },
    { id: 'stats', icon: '📊', label: lang === 'ar' ? 'الإحصائيات' : 'Stats' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: 50, paddingBottom: 20 }}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F9A825' }}>🌙 نور رمضان</Text>
          <Text style={{ fontSize: 12, color: '#F9A825' }}>Ramadan 2026</Text>
        </View>
        <TouchableOpacity onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{lang === 'ar' ? 'EN' : 'عربي'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: activeTab === tab.id ? '#F9A825' : '#1E293B',
              borderRadius: 20,
              marginHorizontal: 4,
            }}
          >
            <Text style={{ fontSize: 16 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 10, color: activeTab === tab.id ? 'black' : 'white', fontWeight: 'bold' }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <>
            {/* Stats Card */}
            {stats && (
              <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#8B5CF6' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>{lang === 'ar' ? 'إحصائياتك' : 'Your Stats'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, color: '#F9A825', fontWeight: 'bold', marginRight: 4 }}>{stats.totalPoints}</Text>
                    <Text style={{ color: '#F9A825' }}>pts</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 20, color: '#10B981', fontWeight: 'bold' }}>🔥{stats.currentStreak}</Text><Text style={{ fontSize: 10, color: '#9CA3AF' }}>{lang === 'ar' ? 'أيام' : 'Days'}</Text></View>
                  <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 20, color: '#F9A825', fontWeight: 'bold' }}>🌙{stats.fastingDays}</Text><Text style={{ fontSize: 10, color: '#9CA3AF' }}>{lang === 'ar' ? 'صيام' : 'Fasting'}</Text></View>
                  <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 20, color: '#0EA5E9', fontWeight: 'bold' }}>🕋{stats.prayersCompleted}</Text><Text style={{ fontSize: 10, color: '#9CA3AF' }}>{lang === 'ar' ? 'صلاة' : 'Prayers'}</Text></View>
                </View>
              </View>
            )}

            {/* Location */}
            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: '#F9A825', fontWeight: 'bold', marginBottom: 12 }}>📍 {lang === 'ar' ? 'موقعك' : 'Your Location'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: 'white', fontSize: 14 }}
                  placeholder={lang === 'ar' ? 'خط العرض' : 'Latitude'}
                  placeholderTextColor="#6B7280"
                  value={lat}
                  onChangeText={setLat}
                  keyboardType="numeric"
                />
                <TextInput
                  style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: 'white', fontSize: 14 }}
                  placeholder={lang === 'ar' ? 'خط الطول' : 'Longitude'}
                  placeholderTextColor="#6B7280"
                  value={lng}
                  onChangeText={setLng}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity onPress={fetchPrayerTimes} style={{ backgroundColor: '#F9A825', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 }}>
                <Text style={{ color: 'black', fontWeight: 'bold' }}>{loading ? '...' : `🕐 ${lang === 'ar' ? 'جلب المواقيت' : 'Get Times'}`}</Text>
              </TouchableOpacity>
              {error && <Text style={{ color: '#EF4444', marginTop: 8, textAlign: 'center' }}>{error}</Text>}
            </View>

            {/* Prayer Times */}
            {prayer && (
              <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F9A825' }}>
                <Text style={{ color: '#0EA5E9', fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>🌙 {lang === 'ar' ? 'يوم رمضان' : 'Ramadan Day'} {prayer.ramadanDay || 1}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center', backgroundColor: '#0F172A', padding: 16, borderRadius: 15 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{lang === 'ar' ? 'السحور' : 'Suhoor'}</Text>
                    <Text style={{ color: '#F9A825', fontSize: 24, fontWeight: 'bold' }}>{prayer.suhoorEnd}</Text>
                  </View>
                  <View style={{ alignItems: 'center', backgroundColor: '#0F172A', padding: 16, borderRadius: 15 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{lang === 'ar' ? 'الإفطار' : 'Iftar'}</Text>
                    <Text style={{ color: '#10B981', fontSize: 24, fontWeight: 'bold' }}>{prayer.iftarTime}</Text>
                    {iftarCountdown && <Text style={{ color: '#9CA3AF', fontSize: 10 }}>{iftarCountdown}</Text>}
                  </View>
                </View>
              </View>
            )}

            {/* Fasting & Prayers */}
            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#10B981', fontWeight: 'bold' }}>🌙 {lang === 'ar' ? 'الصيام' : 'Fasting'}</Text>
                <TouchableOpacity onPress={toggleFasting} style={{ backgroundColor: fastingLog?.isFasting ? '#10B981' : '#0F172A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#10B981' }}>
                  <Text style={{ color: fastingLog?.isFasting ? 'black' : '#10B981', fontWeight: 'bold' }}>{fastingLog?.isFasting ? '✓' : '☆'}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => (
                  <TouchableOpacity key={p} onPress={() => togglePrayer(p)} style={{ backgroundColor: prayerLog?.[p] ? '#F9A825' : '#0F172A', padding: 12, borderRadius: 10 }}>
                    <Text style={{ color: prayerLog?.[p] ? 'black' : 'white', fontWeight: 'bold', fontSize: 12 }}>{p === 'fajr' ? 'فجر' : p === 'dhuhr' ? 'ظهر' : p === 'asr' ? 'عصر' : p === 'maghrib' ? 'مغرب' : 'عشاء'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Zakat */}
            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>💰 {lang === 'ar' ? 'الزكاة' : 'Zakat'}</Text>
                <TouchableOpacity onPress={() => setShowZakat(!showZakat)} style={{ backgroundColor: showZakat ? '#F59E0B' : '#0F172A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}>
                  <Text style={{ color: showZakat ? 'black' : '#F59E0B', fontSize: 12 }}>{showZakat ? '✓' : lang === 'ar' ? 'احسب' : 'Calc'}</Text>
                </TouchableOpacity>
              </View>
              {showZakat && (
                <View style={{ marginTop: 12 }}>
                  <TextInput
                    style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: 'white', marginBottom: 8 }}
                    placeholder={lang === 'ar' ? 'المبلغ (ليرة)' : 'Amount (SYP)'}
                    placeholderTextColor="#6B7280"
                    value={wealth.toString()}
                    onChangeText={(t) => setWealth(parseInt(t) || 0)}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{lang === 'ar' ? 'النصاب' : 'Nisab'}: {nisab.toLocaleString()}</Text>
                  <Text style={{ color: wajib ? '#10B981' : '#6B7280', fontWeight: 'bold', marginTop: 4 }}>
                    {wajib ? `${lang === 'ar' ? 'مبلغ الزكاة' : 'Zakat due'}: ${amount.toLocaleString()} SYP` : lang === 'ar' ? 'ليس لديك نصاب' : 'Below nisab'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* DUAS TAB */}
        {activeTab === 'duas' && (
          <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16 }}>
            <Text style={{ color: '#F43F5E', fontWeight: 'bold', marginBottom: 12 }}>🤲 {lang === 'ar' ? 'الأدعية' : 'Duas'}</Text>
            <TextInput
              style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: 'white', marginBottom: 12 }}
              placeholder={lang === 'ar' ? '🔍 بحث...' : '🔍 Search...'}
              placeholderTextColor="#6B7280"
              value={duaSearch}
              onChangeText={setDuaSearch}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 6 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={{ backgroundColor: selectedCategory === cat.id ? '#F43F5E' : '#0F172A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 }}>
                  <Text style={{ color: 'white', fontSize: 10 }}>{lang === 'ar' ? cat.nameAr : cat.nameEn}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {filteredDuas.map((dua: any) => (
                <View key={dua.id} style={{ backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <Text style={{ color: 'white', fontSize: 14, lineHeight: 22 }}>{dua.textAr}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{dua.textEn}</Text>
                  <Text style={{ color: '#F43F5E', fontSize: 10, marginTop: 4 }}>📚 {dua.source}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* QURAN TAB */}
        {activeTab === 'quran' && (
          <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#8B5CF6', fontWeight: 'bold' }}>📖 {lang === 'ar' ? 'القرآن' : 'Quran'}</Text>
              <Text style={{ color: '#9CA3AF' }}>{quranPages} / 604</Text>
            </View>
            <View style={{ backgroundColor: '#0F172A', borderRadius: 15, padding: 20, marginBottom: 16 }}>
              <Text style={{ color: '#F9A825', fontSize: 32, fontWeight: 'bold', textAlign: 'center' }}>{quranPages}</Text>
              <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>{lang === 'ar' ? 'صفحة' : 'pages'}</Text>
            </View>
            <TouchableOpacity onPress={() => updateQuran(Math.min(quranPages + 1, 604))} style={{ backgroundColor: '#8B5CF6', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>+1 {lang === 'ar' ? 'صفحة' : 'page'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => updateQuran(0)} style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF' }}>{lang === 'ar' ? 'إعادة تعيين' : 'Reset'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && stats && (
          <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16 }}>
            <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 16 }}>📊 {lang === 'ar' ? 'الإحصائيات' : 'Statistics'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <View style={{ width: '48%', backgroundColor: '#0F172A', borderRadius: 15, padding: 16, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, color: '#F9A825', fontWeight: 'bold' }}>{stats.totalPoints}</Text>
                <Text style={{ color: '#9CA3AF' }}>{lang === 'ar' ? 'نقاط' : 'Points'}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#0F172A', borderRadius: 15, padding: 16, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, color: '#10B981', fontWeight: 'bold' }}>🔥{stats.currentStreak}</Text>
                <Text style={{ color: '#9CA3AF' }}>{lang === 'ar' ? 'أيام متتالية' : 'Day Streak'}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#0F172A', borderRadius: 15, padding: 16, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, color: '#F9A825', fontWeight: 'bold' }}>{stats.fastingDays}</Text>
                <Text style={{ color: '#9CA3AF' }}>{lang === 'ar' ? 'أيام صيام' : 'Fasting Days'}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#0F172A', borderRadius: 15, padding: 16, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, color: '#0EA5E9', fontWeight: 'bold' }}>{stats.prayersCompleted}</Text>
                <Text style={{ color: '#9CA3AF' }}>{lang === 'ar' ? 'صلوات' : 'Prayers'}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
