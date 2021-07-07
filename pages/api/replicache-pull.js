import {db} from '../../db.js';

export default async (req, res) => {
  const pull = req.body;
  console.log(`Processing pull`, JSON.stringify(pull));
  const t0 = Date.now();

  try {
    await db.tx(async t => {
      const lastMutationID = parseInt(
        (
          await db.oneOrNone(
            'select last_mutation_id from replicache_client where id = $1',
            pull.clientID,
          )
        )?.last_mutation_id ?? '0',
      );
      const changed = await db.manyOrNone(
        'select id, sender, content, ord from message where version > $1',
        parseInt(pull.cookie ?? 0),
      );
      const cookie = (
        await db.one('select max(version) as version from message')
      ).version;
      console.log({cookie, lastMutationID, changed});

      const patch = [];
      console.log('pull hi', pull)
      if (pull.cookie === null) {
        patch.push({
          op: 'clear',
        });
      }

      patch.push(
        ...changed.map(row => ({
          op: 'put',
          key: `message/${row.id}`,
          value: {
            from: row.sender,
            content: row.content,
            order: parseInt(row.ord),
          },
        })),
      );

      res.json({
        lastMutationID,
        cookie,
        patch,
      });
      res.end();
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.toString());
  } finally {
    console.log('Processed pull in', Date.now() - t0);
  }
};

// export default async (req, res) => {
//   res.json({
//     // We will discuss these two fields in later steps.
//     lastMutationID: 0,
//     cookie: null,
//     patch: [
//       {op: 'clear'},
//       {
//         op: 'put',
//         key: 'message/qpdgkvpb9ao',
//         value: {
//           from: 'Jane',
//           content: "Hey, what's for lunch?",
//           order: 1,
//         },
//       },
//       {
//         op: 'put',
//         key: 'message/5ahljadc408',
//         value: {
//           from: 'Fred',
//           content: 'tacos?',
//           order: 2,
//         },
//       },
//     ],
//   });
//   res.end();
// };