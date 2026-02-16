<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', children, class: className = '', ...rest }: Props = $props();

	const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors active:scale-[0.98] touch-target';

	const variantClasses: Record<string, string> = {
		primary: 'bg-primary text-text-on-primary hover:bg-primary-dark',
		secondary: 'bg-surface border border-border text-text hover:bg-surface-hover',
		ghost: 'text-text-muted hover:bg-surface-hover',
		danger: 'bg-danger text-white hover:bg-red-700'
	};

	const sizeClasses: Record<string, string> = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};
</script>

<button class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {className}" {...rest}>
	{@render children()}
</button>
