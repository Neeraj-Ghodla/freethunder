import * as vscode from 'vscode';
import { RequestPanel } from './RequestPanel';

export function activate(context: vscode.ExtensionContext) {
	console.log('FreeThunder is now active!');

	// Register command to open new request panel
	const newRequestCommand = vscode.commands.registerCommand(
		'freethunder.newRequest',
		() => {
			RequestPanel.createOrShow(context.extensionUri);
		}
	);
	context.subscriptions.push(newRequestCommand);
}

export function deactivate() { }
