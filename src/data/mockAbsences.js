// Stand-in for FVK's absence/cover feed. Phase 2 replaces this with the real FVK API.
// `id` maps to lesson_requests.absence_ref.
export const MOCK_ABSENCES = [
  { id: 'abs-1001', teacher: 'Anna Lindqvist', group: '7B', yearGroup: 'Åk 7', subject: 'Matematik', time: '08:20–09:20', durationMinutes: 60, cover: 'Erik (vikarie)' },
  { id: 'abs-1002', teacher: 'Anna Lindqvist', group: '8A', yearGroup: 'Åk 8', subject: 'Matematik', time: '09:40–10:40', durationMinutes: 60, cover: null },
  { id: 'abs-1003', teacher: 'Johan Berg', group: '5C', yearGroup: 'Åk 5', subject: 'Svenska', time: '10:00–10:45', durationMinutes: 45, cover: 'Sara (resurs)' },
  { id: 'abs-1004', teacher: 'Johan Berg', group: '9A', yearGroup: 'Åk 9', subject: 'Engelska', time: '13:00–14:00', durationMinutes: 60, cover: null },
  { id: 'abs-1005', teacher: 'Leila Haddad', group: 'NA22b', yearGroup: 'Gy2', subject: 'Biologi', time: '14:15–15:35', durationMinutes: 80, cover: 'Mats (vikarie)' },
];
