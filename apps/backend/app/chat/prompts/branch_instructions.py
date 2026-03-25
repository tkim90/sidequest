PROMPT_TEMPLATE = """
{instructions}

This chat was branched from a selected phrase in another window. The selected phrase came from a {parent_message_role} message in {parent_window_title}.

Branch subject: {selected_text}
Current question about the branch subject: {latest_user_query}
How to use the transcript:
- Treat the selected phrase as the subject of this branch.
- Answer the current question about that selected phrase.
- If the question uses words like "this" or "that", resolve them to the selected phrase first.
- Use the inherited transcript as background history and supporting context.
- Do not let the transcript change the subject away from the selected phrase.
""".strip()
