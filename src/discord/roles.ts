/**
 * Discord role grant/revoke — env-driven stub.
 * When DISCORD_BOT_TOKEN / GUILD / ROLE are missing, operations no-op and log.
 */

import { config } from '../config';
import { store } from '../store/memoryStore';

export interface DiscordRoleResult {
  ok: boolean;
  stubbed: boolean;
  action: 'grant' | 'revoke';
  discordId: string;
  roleId: string;
  message: string;
}

function isConfigured(): boolean {
  return Boolean(
    config.discord.botToken &&
      config.discord.guildId &&
      config.discord.premiumRoleId
  );
}

async function discordApi(
  method: 'PUT' | 'DELETE',
  discordId: string
): Promise<{ status: number; body: string }> {
  const url = `https://discord.com/api/v10/guilds/${config.discord.guildId}/members/${discordId}/roles/${config.discord.premiumRoleId}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bot ${config.discord.botToken}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await res.text();
  return { status: res.status, body };
}

export async function grantPremiumRole(
  discordId: string
): Promise<DiscordRoleResult> {
  const roleId = config.discord.premiumRoleId || 'ROLE_UNSET';
  if (!discordId) {
    return {
      ok: false,
      stubbed: true,
      action: 'grant',
      discordId: '',
      roleId,
      message: 'missing_discord_id',
    };
  }

  if (!isConfigured()) {
    store.appendAudit({
      discordId,
      decision: 'allow',
      reason: 'discord_grant_stubbed_missing_env',
    });
    return {
      ok: true,
      stubbed: true,
      action: 'grant',
      discordId,
      roleId,
      message: 'stubbed_no_discord_token',
    };
  }

  try {
    const { status, body } = await discordApi('PUT', discordId);
    const ok = status === 204 || status === 200;
    store.appendAudit({
      discordId,
      decision: ok ? 'allow' : 'block',
      reason: ok ? 'discord_role_granted' : `discord_grant_failed_${status}`,
      meta: { body: body.slice(0, 200) },
    });
    return {
      ok,
      stubbed: false,
      action: 'grant',
      discordId,
      roleId,
      message: ok ? 'granted' : `http_${status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    store.appendAudit({
      discordId,
      decision: 'block',
      reason: 'discord_grant_exception',
      meta: { message },
    });
    return {
      ok: false,
      stubbed: false,
      action: 'grant',
      discordId,
      roleId,
      message,
    };
  }
}

export async function revokePremiumRole(
  discordId: string
): Promise<DiscordRoleResult> {
  const roleId = config.discord.premiumRoleId || 'ROLE_UNSET';
  if (!discordId) {
    return {
      ok: false,
      stubbed: true,
      action: 'revoke',
      discordId: '',
      roleId,
      message: 'missing_discord_id',
    };
  }

  if (!isConfigured()) {
    store.appendAudit({
      discordId,
      decision: 'revoke',
      reason: 'discord_revoke_stubbed_missing_env',
    });
    return {
      ok: true,
      stubbed: true,
      action: 'revoke',
      discordId,
      roleId,
      message: 'stubbed_no_discord_token',
    };
  }

  try {
    const { status, body } = await discordApi('DELETE', discordId);
    const ok = status === 204 || status === 200;
    store.appendAudit({
      discordId,
      decision: 'revoke',
      reason: ok ? 'discord_role_revoked' : `discord_revoke_failed_${status}`,
      meta: { body: body.slice(0, 200) },
    });
    return {
      ok,
      stubbed: false,
      action: 'revoke',
      discordId,
      roleId,
      message: ok ? 'revoked' : `http_${status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    store.appendAudit({
      discordId,
      decision: 'revoke',
      reason: 'discord_revoke_exception',
      meta: { message },
    });
    return {
      ok: false,
      stubbed: false,
      action: 'revoke',
      discordId,
      roleId,
      message,
    };
  }
}
