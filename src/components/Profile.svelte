<script lang="ts">
  import { user } from '$lib/stores/userStore';
</script>

<div class="flex min-w-[300px] max-w-[500px] items-center gap-4">
  <div
    class="text-bold flex h-[90px] w-[90px] min-w-[70px] max-w-[90px] items-center justify-center rounded-full bg-gradient-to-r from-blue to-green text-2xl"
  >
    {$user.providerName ? $user.providerName.substring(0, 1) : ''}
  </div>
  <div class="flex flex-col gap-2">
    <div class="data-value-lg">{$user.providerName}</div>
    <div class="text-sm">{$user.msaId}</div>
    <div class="text-sm leading-3">{$user.address}</div>
  </div>
</div>
