import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = [
  { id: 'all', nameAr: 'الكل', nameEn: 'All' },
  { id: 'iftar', nameAr: 'الإفطار', nameEn: 'Iftar' },
  { id: 'suhoor', nameAr: 'السحور', nameEn: 'Suhoor' },
  { id: 'prayer', nameAr: 'الصلاة', nameEn: 'Prayer' },
  { id: 'morning', nameAr: 'أذكار الصباح', nameEn: 'Morning' },
  { id: 'evening', nameAr: 'أذكار المساء', nameEn: 'Evening' },
];

const STATIC_DUAS = [
  { id: 1, textAr: 'اللهم بارك لنا في رجب وشعبان وبلغنا رمضان', textEn: 'O Allah, grant us blessing in Rajab and Sha\'ban and let us reach Ramadan', category: 'prayer', source: 'authenticated' },
  { id: 2, textAr: 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار', textEn: 'Our Lord, give us in this world good and in the Hereafter good and protect us from the punishment of the Fire', category: 'prayer', source: 'Quran 2:201' },
  { id: 3, textAr: 'لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير', category: 'morning', source: 'Bukhari' },
  { id: 4, textAr: 'أصبحنا وأصبح الملك لله والحمد لله', category: 'morning', source: 'Muslim' },
  { id: 5, textAr: 'اللهم إني أسألك خير هذا اليوم وخير ما بعده', category: 'morning', source: 'Abu Dawud' },
  { id: 6, textAr: 'أمسينا وأمسى الملك لله', category: 'evening', source: 'Muslim' },
  { id: 7, textAr: 'اللهم أني أمسيت أسألك خير ما فيه وخير ما بعده', category: 'evening', source: 'Abu Dawud' },
  { id: 8, textAr: 'فطر الله لك', category: 'iftar', source: 'Bukhari' },
  { id: 9, textAr: 'اللهم لك صمت وعلى رزقك أفطرت', category: 'iftar', source: 'Abu Dawud' },
  { id: 10, textAr: 'ذهب الظمأ وابتلت العروق وثبت الأجر إن شاء الله', category: 'iftar', source: 'Abu Dawud' },
  { id: 11, textAr: 'اللهم بارك لهم في طعامهم وشرابهم', category: 'suhoor', source: 'Bukhari' },
  { id: 12, textAr: 'السحور彩信رنة والأكلة彩信رنة بركة', category: 'suhoor', source: 'authenticated' },
];

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState('home');
  const [prayerLog, setPrayerLog] = useState<Record<string, boolean>>({});
  const [quranPages, setQuranPages] = useState(0);
  const [duaSearch, setDuaSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showZakat, setShowZakat] = useState(false);
  const [wealth, setWealth] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const savedLang = await AsyncStorage.getItem('nur_lang');
      if (savedLang) setLang(savedLang as 'ar' | 'en');
      const savedPrayer = await AsyncStorage.getItem(`prayer_${today}`);
      if (savedPrayer) setPrayerLog(JSON.parse(savedPrayer));
      const savedQuran = await AsyncStorage.getItem('quran_pages');
      if (savedQuran) setQuranPages(parseInt(savedQuran));
    } catch (e) { console.log('Load error:', e); }
  }

  async function togglePrayer(prayerName: string) {
    const updated = { ...prayerLog, [prayerName]: !prayerLog[prayerName] };
    setPrayerLog(updated);
    await AsyncStorage.setItem(`prayer_${today}`, JSON.stringify(updated));
  }

  async function updateQuran(pages: number) {
    setQuranPages(pages);
    await AsyncStorage.setItem('quran_pages', pages.toString());
  }

  const filteredDuas = STATIC_DUAS.filter((dua: any) => {
    const matchSearch = !duaSearch || dua.textAr?.includes(duaSearch) || dua.textEn?.includes(duaSearch);
    const matchCategory = selectedCategory === 'all' || dua.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const nisab = 85 * 8500000;
  const wajib = wealth >= nisab;
  const amount = wajib ? Math.floor(wealth * 0.025) : 0;

  const tabs = [
    { id: 'home', icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'duas', icon: '🤲', label: lang === 'ar' ? 'الأدعية' : 'Duas' },
    { id: 'quran', icon: '📖', label: lang === 'ar' ? 'القرآن' : 'Quran' },
    { id: 'stats', icon: '📊', label: lang === 'ar' ? 'الإحصائيات' : 'Stats' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: 50, paddingBottom: 20 }}>
      <StatusBar style="light" />
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F9A825' }}>🌙 نور رمضان</Text>
          <Text style={{ fontSize: 12, color: '#F9A825' }}>Ramadan 2026</Text>
        </View>
        <TouchableOpacity onPress={() => { const newLang = lang === 'ar' ? 'en' : 'ar'; setLang(newLang); AsyncStorage.setItem('nur_lang', newLang); }} style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{lang === 'ar' ? 'EN' : 'عربي'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 }}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === tab.id ? '#F9A825' : '#1E293B', borderRadius: 20, marginHorizontal: 4 }}>
            <Text style={{ fontSize: 16 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 10, color: activeTab === tab.id ? 'black' : 'white', fontWeight: 'bold' }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'home' && (
          <>
            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: '#10B981', fontWeight: 'bold', marginBottom: 12 }}>🌙 {lang === 'ar' ? 'صلوات اليوم' : "Today's Prayers"}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => (
                  <TouchableOpacity key={p} onPress={() => togglePrayer(p)} style={{ backgroundColor: prayerLog[p] ? '#F9A825' : '#0F172A', padding: 12, borderRadius: 10 }}>
                    <Text style={{ color: prayerLog[p] ? 'black' : 'white', fontWeight: 'bold', fontSize: 12 }}>{p === 'fajr' ? 'فجر' : p === 'dhuhr' ? 'ظهر' : p === 'asr' ? 'عصر' : p === 'maghrib' ? 'مغرب' : 'عشاء'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>💰 {lang === 'ar' ? 'الزكاة' : 'Zakat'}</Text>
                <TouchableOpacity onPress={() => setShowZakat(!showZakat)} style={{ backgroundColor: showZakat ? '#F59E0B' : '#0F172A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}>
                  <Text style={{ color: showZakat ? 'black' : '#F59E0B', fontSize: 12 }}>{showZakat ? '✓' : lang === 'ar' ? 'احسب' : 'Calc'}</Text>
                </TouchableOpacity>
              </View>
              {showZakat && (
                <View style={{ marginTop: 12 }}>
                  <TextInput style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: 'white', marginBottom: 8 }} placeholder={lang === 'ar' ? 'المبلغ (ليرة)' : 'Amount (SYP)'} placeholderTextColor="#6B7280" value={wealth > 0 ? wealth.toString() : ''} onChangeText={(t) => setWealth(parseInt(t) || 0)} keyboardType="numeric" />
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{lang === 'ar' ? 'النصاب' : 'Nisab'}: {nisab.toLocaleString()}</Text>
                  <Text style={{ color: wajib ? '#10B981' : '#6B7280', fontWeight: 'bold', marginTop: 4 }}>{wajib ? `${lang === 'ar' ? 'مبلغ الزكاة' : 'Zakat due'}: ${amount.toLocaleString()} SYP` : lang === 'ar' ? 'ليس لديك نصاب' : 'Below nisab'}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'duas' && (
          <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16 }}>
            <Text style={{ color: '#F43F5E', fontWeight: 'bold', marginBottom: 12 }}>🤲 {lang === 'ar' ? 'الأدعية' : 'Duas'}</Text>
            <TextInput style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: 'white', marginBottom: 12 }} placeholder={lang === 'ar' ? '🔍 بحث...' : '🔍 Search...'} placeholderTextColor="#6B7280" value={duaSearch} onChangeText={setDuaSearch} />
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
                  {dua.textEn && <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{dua.textEn}</Text>}
                  <Text style={{ color: '#F43F5E', fontSize: 10, marginTop: 4 }}>📚 {dua.source}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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

        {activeTab === 'stats' && (
          <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 16 }}>
            <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 16 }}>📊 {lang === 'ar' ? 'الإحصائيات' : 'Statistics'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <View style={{ width: '48%', backgroundColor: '#0F172A', borderRadius: 15, padding: 16, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, color: '#F9A825', fontWeight: 'bold' }}>{quranPages}</Text>
                <Text style={{ color: '#9CA3AF' }}>{lang === 'ar' ? 'صفحات' : 'Pages'}</Text>
              </View>
              <View style={{ width: '48%', backgroundColor: '#0F172A', borderRadius: 15, padding: 16, marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, color: '#10B981', fontWeight: 'bold' }}>{Object.values(prayerLog).filter(Boolean).length}</Text>
                <Text style={{ color: '#9CA3AF' }}>{lang === 'ar' ? 'صلوات' : 'Prayers'}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
