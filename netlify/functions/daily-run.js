exports.config = {
  schedule: "0 13 * * *"
};

exports.handler = async () => {
  const baseUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || "https://briefme.info";
  const secret = process.env.ADMIN_REPORT_SECRET;

  if (!secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Missing ADMIN_REPORT_SECRET" })
    };
  }

  try {
    const response = await fetch(`${baseUrl}/api/cron/daily`, {
      method: "POST",
      headers: {
        "x-admin-secret": secret
      }
    });

    const payload = await response.json().catch(() => ({}));
    return {
      statusCode: response.status,
      body: JSON.stringify(payload)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown schedule error"
      })
    };
  }
};
