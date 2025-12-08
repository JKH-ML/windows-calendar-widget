import { GooglePush } from '../../wailsjs/go/main/App'

export async function pushLocalChanges() {
  return GooglePush()
}
