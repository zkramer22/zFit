<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { LoaderCircle } from '@lucide/svelte';

	let mode = $state<'login' | 'register'>('login');
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let error = $state('');
	let submitting = $state(false);

	async function handleSubmit() {
		error = '';
		submitting = true;
		try {
			if (mode === 'register') {
				await authStore.register(email, password, name);
			} else {
				await authStore.loginWithPassword(email, password);
			}
			goto('/', { invalidateAll: true });
		} catch (err: any) {
			error = err?.response?.message || err?.message || 'Something went wrong';
			submitting = false;
		}
	}

	async function handleGoogle() {
		error = '';
		submitting = true;
		try {
			await authStore.loginWithGoogle();
			goto('/', { invalidateAll: true });
		} catch (err: any) {
			error = err?.response?.message || err?.message || 'Google sign-in failed';
			submitting = false;
		}
	}
</script>

<div class="min-h-dvh flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<!-- Branding -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-primary">zFit</h1>
			<p class="text-text-muted text-sm mt-1">Track your training</p>
		</div>

		<!-- Card -->
		<div class="rounded-xl border border-border bg-surface p-6">
			<!-- Mode toggle -->
			<div class="flex rounded-lg bg-surface-dim p-1 mb-6">
				<button
					class="flex-1 py-2 text-sm font-medium rounded-md transition-colors
						{mode === 'login' ? 'bg-surface text-text shadow-sm' : 'text-text-muted'}"
					onclick={() => { mode = 'login'; error = ''; }}
				>
					Sign In
				</button>
				<button
					class="flex-1 py-2 text-sm font-medium rounded-md transition-colors
						{mode === 'register' ? 'bg-surface text-text shadow-sm' : 'text-text-muted'}"
					onclick={() => { mode = 'register'; error = ''; }}
				>
					Create Account
				</button>
			</div>

			<!-- Form -->
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
				{#if mode === 'register'}
					<div>
						<label for="name" class="block text-sm font-medium text-text-muted mb-1">Name</label>
						<input
							id="name"
							type="text"
							bind:value={name}
							placeholder="Your name"
							class="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-text
								placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
						/>
					</div>
				{/if}

				<div>
					<label for="email" class="block text-sm font-medium text-text-muted mb-1">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						placeholder="you@example.com"
						class="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-text
							placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-text-muted mb-1">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						minlength={8}
						placeholder="Min. 8 characters"
						class="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-text
							placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
					/>
				</div>

				{#if error}
					<p class="text-sm text-danger">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={submitting}
					class="w-full py-2.5 rounded-lg bg-primary text-text-on-primary font-medium
						disabled:opacity-50 flex items-center justify-center gap-2"
				>
					{#if submitting}
						<LoaderCircle class="w-4 h-4 animate-spin" />
					{/if}
					{mode === 'login' ? 'Sign In' : 'Create Account'}
				</button>
			</form>

			<!-- Divider -->
			<div class="flex items-center gap-3 my-5">
				<div class="flex-1 h-px bg-border"></div>
				<span class="text-xs text-text-muted">or</span>
				<div class="flex-1 h-px bg-border"></div>
			</div>

			<!-- OAuth -->
			<button
				onclick={handleGoogle}
				disabled={submitting}
				class="w-full py-2.5 rounded-lg border border-border font-medium text-sm
					hover:bg-surface-hover disabled:opacity-50 flex items-center justify-center gap-2"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24">
					<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
					<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
					<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
					<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
				</svg>
				Continue with Google
			</button>
		</div>
	</div>
</div>
