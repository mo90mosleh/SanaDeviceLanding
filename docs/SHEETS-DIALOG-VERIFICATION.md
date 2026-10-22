# Consultation field mapping and success dialog

The request now preserves the existing internal payload while matching the owner-confirmed Google Sheets headers: fullName, labName, mobile, campaign, source, medium, content, term, product, company, pageUrl and time. Missing UTM parameters stay empty. No existing spreadsheet row is rewritten.

After successful HTTP acknowledgement, a native modal confirms submission, clears the form and supports keyboard focus, Escape and explicit close/confirmation buttons. Failures retain the contact fields and never open the success dialog.

The explicitly marked live workflow sends one synthetic labelled record only after finding the published dialog. Its result is followed by a bounded read of that labelled row to verify the actual Google Sheets mapping.
