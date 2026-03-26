import { create } from 'zustand';

export type MeetingType = 'General' | 'Kick-off' | 'Wireframe';

interface MeetingState {
  meetingType: MeetingType;
  setMeetingType: (type: MeetingType) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meetingType: 'General',
  setMeetingType: (type) => set({ meetingType: type }),
}));
