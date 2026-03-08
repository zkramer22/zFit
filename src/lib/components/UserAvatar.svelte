<script lang="ts">
	import { pb } from '$lib/pocketbase/client';

	let {
		name = '',
		avatar = '',
		userId = '',
		size = 'md',
	}: {
		name?: string;
		avatar?: string;
		userId?: string;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const sizes = {
		sm: 'w-8 h-8 text-xs',
		md: 'w-12 h-12 text-base',
		lg: 'w-16 h-16 text-xl',
	};

	const colors = [
		'bg-blue-500',
		'bg-emerald-500',
		'bg-violet-500',
		'bg-amber-500',
		'bg-rose-500',
		'bg-cyan-500',
		'bg-indigo-500',
		'bg-teal-500',
		'bg-orange-500',
		'bg-pink-500',
	];

	function getInitials(name: string): string {
		if (!name) return '?';
		return name
			.split(/\s+/)
			.filter(Boolean)
			.map(w => w[0].toUpperCase())
			.slice(0, 2)
			.join('');
	}

	function getColor(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}

	const avatarUrl = $derived(
		avatar && userId
			? `${pb.baseURL}/api/files/users/${userId}/${avatar}`
			: ''
	);
	let imgFailed = $state(false);
	const showImage = $derived(!!avatarUrl && !imgFailed);

	const initials = $derived(getInitials(name));
	const colorClass = $derived(getColor(name));
	const sizeClass = $derived(sizes[size]);
</script>

{#if showImage}
	<img
		src={avatarUrl}
		alt={name}
		class="rounded-full object-cover {sizeClass}"
		onerror={() => { imgFailed = true; }}
	/>
{:else}
	<div class="rounded-full flex items-center justify-center font-semibold text-white {colorClass} {sizeClass}">
		{initials}
	</div>
{/if}
