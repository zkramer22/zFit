import type { RecordModel } from 'pocketbase';

export type SetUnit = 'lb' | 'kg' | 'sec' | 'bw' | 'band';
export type DistanceUnit = 'yds' | 'ft' | 'm';

export interface User extends RecordModel {
	email: string;
	name: string;
	avatar: string;
}

export interface Exercise extends RecordModel {
	user: string;
	name: string;
	description: string;
	muscle_groups: string[];
	category: 'strength' | 'stability' | 'core' | 'warmup' | 'posterior_chain' | 'pt' | 'bodyweight';
	video_urls: VideoRef[];
}

export interface VideoRef {
	url: string;
	title: string;
	thumbnail_url: string;
}

export interface Workout extends RecordModel {
	user: string;
	name: string;
	description: string;
	tags: string[];
}

export interface WorkoutExercise extends RecordModel {
	user: string;
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
	user: string;
	name: string;
	description: string;
	active: boolean;
}

export interface ProgramWorkout extends RecordModel {
	user: string;
	program: string;
	workout: string;
	day_number: number;
}

export interface Session extends RecordModel {
	user: string;
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
	user: string;
	session: string;
	exercise: string;
	order: number;
	sets: SetData[];
	rpe: number | null;
	pain_flag: boolean;
	notes: string;
}

export interface Goal extends RecordModel {
	user: string;
	exercise: string;
	metric: 'weight' | 'reps' | 'hold_time' | 'rom';
	target_value: number;
	target_unit: string;
	target_date: string;
	achieved: boolean;
	achieved_date: string;
	notes: string;
}

export interface Submission extends RecordModel {
	user: string;
	type: 'exercise' | 'workout';
	record_id: string;
	record_name: string;
	status: 'pending' | 'approved' | 'rejected';
	notes: string;
	reviewer_notes: string;
}

export interface Feedback extends RecordModel {
	user: string;
	type: 'feature' | 'bug';
	title: string;
	description: string;
	status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
}

export interface SubmissionExpanded extends Submission {
	expand?: {
		user?: User;
	};
}

export interface FeedbackExpanded extends Feedback {
	expand?: {
		user?: User;
	};
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
