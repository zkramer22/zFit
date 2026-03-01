import type { RecordModel } from 'pocketbase';

export type SetUnit = 'lb' | 'kg' | 'sec' | 'bw' | 'band';
export type DistanceUnit = 'yds' | 'ft' | 'm';

export interface Exercise extends RecordModel {
	name: string;
	description: string;
	muscle_groups: string[];
	category: 'strength' | 'stability' | 'core' | 'warmup' | 'posterior_chain';
	video_urls: VideoRef[];
}

export interface VideoRef {
	url: string;
	title: string;
	thumbnail_url: string;
}

export interface Workout extends RecordModel {
	name: string;
	description: string;
	tags: string[];
}

export interface WorkoutExercise extends RecordModel {
	workout: string;
	exercise: string;
	order: number;
	section: 'warmup' | 'main' | 'core' | 'cooldown';
	target_sets: number;
	target_reps: string;
	target_value: string;
	target_unit: SetUnit;
	target_distance: string;
	target_distance_unit: DistanceUnit | null;
	notes: string;
}

export interface Program extends RecordModel {
	name: string;
	description: string;
	active: boolean;
}

export interface ProgramWorkout extends RecordModel {
	program: string;
	workout: string;
	day_number: number;
}

export interface Session extends RecordModel {
	workout: string;
	program: string;
	date: string;
	notes: string;
	completed: boolean;
}

export interface SetData {
	reps: number | null;
	value: number | null;
	unit: SetUnit;
	distance: number | null;
	distance_unit: DistanceUnit | null;
	notes: string;
	completed: boolean;
}

export interface SessionEntry extends RecordModel {
	session: string;
	exercise: string;
	order: number;
	sets: SetData[];
	rpe: number | null;
	pain_flag: boolean;
	notes: string;
}

export interface Goal extends RecordModel {
	exercise: string;
	metric: 'weight' | 'reps' | 'hold_time' | 'rom';
	target_value: number;
	target_unit: string;
	target_date: string;
	achieved: boolean;
	achieved_date: string;
	notes: string;
}

// Expanded types for when relations are resolved
export interface WorkoutExerciseExpanded extends WorkoutExercise {
	expand?: {
		exercise?: Exercise;
	};
}

export interface ProgramWorkoutExpanded extends ProgramWorkout {
	expand?: {
		workout?: Workout;
	};
}

export interface SessionEntryExpanded extends SessionEntry {
	expand?: {
		exercise?: Exercise;
	};
}

export interface SessionExpanded extends Session {
	expand?: {
		workout?: Workout;
		program?: Program;
	};
}
