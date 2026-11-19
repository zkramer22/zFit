import type { RecordModel } from 'pocketbase';

export type Measure = 'weight' | 'bodyweight' | 'time' | 'band';
export type LoadFactor = 'single' | 'pair' | 'each_side';
export type WeightUnit = 'lb' | 'kg';
export type DistanceUnit = 'yds' | 'ft' | 'm';

export interface User extends RecordModel {
	email: string;
	name: string;
	avatar: string;
	weight_unit: WeightUnit | '';
	/** The user's resistance bands, lightest first. */
	band_levels: string[] | null;
}

export interface Exercise extends RecordModel {
	user: string;
	name: string;
	description: string;
	muscle_groups: string[];
	category: 'strength' | 'stability' | 'core' | 'warmup' | 'posterior_chain' | 'pt' | 'bodyweight';
	video_urls: VideoRef[];
	measure: Measure;
	/** Empty means single. */
	load_factor: LoadFactor | '';
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

export interface TargetFields {
	target_sets: number;
	target_reps: string;
	/** In the user's weight unit. */
	target_load: number | null;
	target_seconds: number | null;
	target_band: string;
	target_distance: string;
	target_distance_unit: DistanceUnit | null;
}

export interface WorkoutExercise extends RecordModel, TargetFields {
	user: string;
	workout: string;
	exercise: string;
	order: number;
	section: 'warmup' | 'main' | 'core' | 'cooldown';
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

/** Each exercise's measure decides which fields a set uses. */
export interface SetData {
	reps: number | null;
	load: number | null;
	load_unit: WeightUnit | null;
	seconds: number | null;
	band: string | null;
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

export interface UserExercise extends RecordModel {
	user: string;
	exercise: string; // FK to canonical exercise
	description: string;
	video_urls: VideoRef[];
}

export interface Submission extends RecordModel {
	user: string;
	exercise: string;        // FK to exercises (canonical or user-created)
	user_exercise: string;   // FK to user_exercises (set for forks, empty for new)
	record_name: string;
	diff: Record<string, { old: any; new: any }>;
	status: 'pending' | 'approved' | 'rejected';
	notes: string;
	reviewer_notes: string;
}

export interface Notification extends RecordModel {
	user: string;
	message: string;
	type: 'submission_approved' | 'submission_rejected';
	link: string;
	read: boolean;
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
		exercise?: Exercise;
		user_exercise?: UserExercise;
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
