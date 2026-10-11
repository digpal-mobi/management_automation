import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Project, ProjectAnalytics, User } from '@/types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  analytics: ProjectAnalytics | null;
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  analytics: null,
  users: [],
  currentUser: null,
  loading: false,
  error: null,
};

export const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    setAnalytics: (state, action: PayloadAction<ProjectAnalytics | null>) => {
      state.analytics = action.payload;
    },
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
      if (!state.currentUser && action.payload.length > 0) {
        state.currentUser = action.payload[0];
      }
    },
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.unshift(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setProjects,
  setCurrentProject,
  setAnalytics,
  setUsers,
  setCurrentUser,
  addProject,
  setLoading,
  setError,
} = projectSlice.actions;

export default projectSlice.reducer;
