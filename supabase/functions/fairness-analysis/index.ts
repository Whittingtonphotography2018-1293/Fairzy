import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TurnData {
  member_id: string;
  display_name: string;
  list_name: string;
  category: string;
  turn_count: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: turnLists, error: listsError } = await supabase
      .from('turn_lists')
      .select('id, name, category')
      .order('created_at', { ascending: false });

    if (listsError) throw listsError;

    if (!turnLists || turnLists.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          stats: [],
          insights: 'No turn lists found. Create your first turn list to start tracking fairness!',
          overall_fairness_score: 100,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const listIds = turnLists.map(list => list.id);

    const { data: turnHistory, error: historyError } = await supabase
      .from('turn_history')
      .select(`
        member_id,
        turn_list_id,
        turn_taken_at,
        turn_list_members (
          display_name,
          user_id
        )
      `)
      .in('turn_list_id', listIds)
      .order('turn_taken_at', { ascending: false });

    if (historyError) throw historyError;

    const memberStats = new Map<string, {
      member_id: string;
      display_name: string;
      user_id: string;
      lists: Map<string, { list_name: string; category: string; count: number }>;
      total_turns: number;
    }>();

    for (const history of turnHistory || []) {
      const memberId = history.member_id;
      const listId = history.turn_list_id;
      const memberInfo = history.turn_list_members;
      
      if (!memberId || !memberInfo) continue;

      if (!memberStats.has(memberId)) {
        memberStats.set(memberId, {
          member_id: memberId,
          display_name: memberInfo.display_name,
          user_id: memberInfo.user_id,
          lists: new Map(),
          total_turns: 0,
        });
      }

      const member = memberStats.get(memberId)!;
      member.total_turns++;

      const list = turnLists.find(l => l.id === listId);
      if (list) {
        const listKey = `${list.name}-${list.category}`;
        if (!member.lists.has(listKey)) {
          member.lists.set(listKey, {
            list_name: list.name,
            category: list.category,
            count: 0,
          });
        }
        member.lists.get(listKey)!.count++;
      }
    }

    const statsArray = Array.from(memberStats.values()).map(member => ({
      member_id: member.member_id,
      display_name: member.display_name,
      user_id: member.user_id,
      total_turns: member.total_turns,
      lists: Array.from(member.lists.values()),
    }));

    if (statsArray.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          stats: [],
          insights: 'No turns recorded yet. Take some turns to start tracking fairness!',
          overall_fairness_score: 100,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const totalTurns = statsArray.reduce((sum, s) => sum + s.total_turns, 0);
    const avgTurns = totalTurns / statsArray.length;
    const variance = statsArray.reduce((sum, s) => sum + Math.pow(s.total_turns - avgTurns, 2), 0) / statsArray.length;
    const stdDev = Math.sqrt(variance);
    const fairnessScore = Math.max(0, Math.min(100, 100 - (stdDev / avgTurns) * 100));

    const statsForAI = statsArray.map(s => ({
      name: s.display_name,
      total_turns: s.total_turns,
      percentage: ((s.total_turns / totalTurns) * 100).toFixed(1),
      lists: s.lists,
    }));

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    let insights = '';

    if (openaiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a fairness analyst for a turn-taking app. Analyze the turn distribution data and provide brief, friendly insights (2-3 sentences max). Focus on balance, patterns, and gentle suggestions. Be encouraging and positive.',
              },
              {
                role: 'user',
                content: `Analyze this turn data across multiple lists:\n\n${JSON.stringify(statsForAI, null, 2)}\n\nTotal turns: ${totalTurns}\nFairness score: ${fairnessScore.toFixed(1)}/100\n\nProvide brief insights about fairness and balance.`,
              },
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        });

        if (openaiResponse.ok) {
          const aiData = await openaiResponse.json();
          insights = aiData.choices[0]?.message?.content || 'Analysis complete.';
        } else {
          insights = 'Turn distribution analyzed. Check the stats below for details.';
        }
      } catch (error) {
        console.error('AI analysis error:', error);
        insights = 'Turn distribution analyzed. Check the stats below for details.';
      }
    } else {
      if (fairnessScore >= 80) {
        insights = 'Great balance! Everyone is getting fairly equal turns across all lists.';
      } else if (fairnessScore >= 60) {
        insights = 'Pretty good balance overall. Some members might be getting slightly more turns.';
      } else {
        insights = 'There\'s some imbalance in turn distribution. Consider balancing turns across different activities.';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: statsArray,
        insights,
        overall_fairness_score: Math.round(fairnessScore),
        total_turns: totalTurns,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});