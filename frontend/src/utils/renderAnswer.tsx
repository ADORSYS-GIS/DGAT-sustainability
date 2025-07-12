import React from "react";

export function renderAnswer(answer: unknown) {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return (
      <div>
        <strong>Answer:</strong>{" "}
        {answer !== undefined ? (
          String(answer)
        ) : (
          <span className="text-gray-400">No answer</span>
        )}
      </div>
    );
  }
  const a = answer as Record<string, unknown>;
  return (
    <>
      {"yesNo" in a && (
        <div>
          <strong>Yes/No:</strong>{" "}
          {a.yesNo === true ? "Yes" : a.yesNo === false ? "No" : ""}
        </div>
      )}
      {"percentage" in a && (
        <div>
          <strong>Percentage:</strong> {a.percentage as number}%
        </div>
      )}
      {"text" in a && a.text && (
        <div>
          <strong>Text:</strong> {a.text as string}
        </div>
      )}
      {"files" in a &&
        Array.isArray(a.files) &&
        (a.files as Array<{ name?: string; url?: string }>).length > 0 && (
          <div>
            <strong>Files:</strong>
            <ul className="list-disc ml-6">
              {(a.files as Array<{ name?: string; url?: string }>).map(
                (file, i) => (
                  <li key={i}>
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {file.name || `File ${i + 1}`}
                      </a>
                    ) : (
                      file.name || `File ${i + 1}`
                    )}
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
    </>
  );
}
